"""
Smart LMS - YouTube Service
Professional rewrite for robust video processing and transcription.
"""

import asyncio
import re
import os
import json
import glob
import time
import tempfile
import shutil
from typing import List, Dict, Optional
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from groq import Groq
from app.config import settings
# from app.database import SessionLocal # For caching if needed later

class YouTubeService:
    def __init__(self):
        api_key = settings.GROQ_API_KEY
        self.groq_client = Groq(api_key=api_key) if api_key else None
        if not api_key:
            print("Warning: GROQ_API_KEY not found. Groq Whisper fallback will be disabled.")

        try:
            from faster_whisper import WhisperModel  # type: ignore
            self._WhisperModel = WhisperModel
            self.local_whisper_available = True
        except Exception:
            self._WhisperModel = None
            self.local_whisper_available = False

        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
        }
        self._groq_cooldown_until = 0.0

    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """Extract the 11-character YouTube video ID using robust regex."""
        patterns = [
            r"(?:v=|\/v\/|youtu\.be\/|embed\/|shorts\/|watch\?v=)([a-zA-Z0-9_-]{11})",
            r"^([a-zA-Z0-9_-]{11})$" # In case just the ID is passed
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def normalize_watch_url(url: Optional[str]) -> Optional[str]:
        """Normalize YouTube URLs/IDs to canonical watch URLs for consistent playback."""
        if not url:
            return url

        video_id = YouTubeService.extract_video_id(url)
        if video_id:
            return f"https://www.youtube.com/watch?v={video_id}"
        return url

    async def get_video_info(self, video_url: str) -> Dict:
        """Fetch video metadata using yt-dlp."""
        def _extract():
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return {
                    "id": info.get("id"),
                    "title": info.get("title", "Untitled"),
                    "duration": info.get("duration", 0),
                    "thumbnail": info.get("thumbnails", [{}])[-1].get("url") if info.get("thumbnails") else None,
                    "description": info.get("description", ""),
                    "view_count": info.get("view_count", 0),
                    "uploader": info.get("uploader", "Unknown"),
                }
        
        return await asyncio.get_event_loop().run_in_executor(None, _extract)

    async def get_playlist_videos(self, playlist_url: str) -> List[Dict]:
        """Extract all videos from a playlist or a single video URL."""
        def _extract():
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(playlist_url, download=False)
                videos = []
                
                if "entries" in info:
                    for entry in info["entries"]:
                        if entry:
                            raw_url = entry.get("url") or entry.get("webpage_url") or entry.get("id")
                            videos.append({
                                "id": entry.get("id"),
                                "title": entry.get("title", "Untitled"),
                                "url": self.normalize_watch_url(raw_url),
                                "thumbnail": entry.get("thumbnails", [{}])[-1].get("url") if entry.get("thumbnails") else None,
                                "duration": entry.get("duration", 0),
                            })
                else:
                    raw_url = info.get("webpage_url") or playlist_url
                    videos.append({
                        "id": info.get("id"),
                        "title": info.get("title", "Untitled"),
                        "url": self.normalize_watch_url(raw_url),
                        "thumbnail": info.get("thumbnails", [{}])[-1].get("url") if info.get("thumbnails") else None,
                        "duration": info.get("duration", 0),
                    })
                return videos

        return await asyncio.get_event_loop().run_in_executor(None, _extract)

    async def get_transcript(self, video_url: str, prefer_local: bool = False) -> str:
        """
        Get transcript with a multi-layered fallback strategy:
        1. Official manual captions (en, ja, hi)
        2. Auto-generated captions (en, ja, hi)
        3. Any available captions
        4. Groq Whisper v3 Fallback
        """
        video_id = self.extract_video_id(video_url)
        if not video_id:
            return ""

        # Tier 1: YouTube Transcript API
        try:
            transcript_text = await self._fetch_api_transcript(video_id)
            if transcript_text:
                return transcript_text
        except Exception as e:
            print(f"Transcript API failed: {e}")

        if prefer_local:
            # Batch mode: avoid external rate limits where possible.
            try:
                transcript_text = await self._fetch_local_whisper_transcript(video_url)
                if transcript_text:
                    return transcript_text
            except Exception as e:
                print(f"Local whisper failed: {e}")

        # Tier 2: Groq Whisper Fallback (AI)
        try:
            transcript_text = await self._fetch_whisper_transcript(video_url)
            if transcript_text:
                return transcript_text
        except Exception as e:
            print(f"Groq Whisper failed: {e}")

        # Tier 3: Local faster-whisper fallback (AI, offline-capable)
        try:
            transcript_text = await self._fetch_local_whisper_transcript(video_url)
            if transcript_text:
                return transcript_text
        except Exception as e:
            print(f"Local whisper failed: {e}")
        
        return ""

    async def _fetch_api_transcript(self, video_id: str) -> Optional[str]:
        """Internal helper for Tier 1 transcript fetching."""
        def _ytt():
            try:
                t_list = YouTubeTranscriptApi.list_transcripts(video_id)
                langs = ['en', 'ja', 'hi', 'es', 'fr', 'de', 'pt', 'ru', 'ko', 'zh-Hans', 'zh-Hant', 'ar', 'id', 'tr']
                try:
                    transcript = t_list.find_transcript(langs)
                except:
                    try:
                        transcript = t_list.find_generated_transcript(langs)
                    except:
                        transcript = next(iter(t_list))
                if transcript:
                    return " ".join([p['text'] for p in transcript.fetch()])
            except:
                return None
            return None
        return await asyncio.get_event_loop().run_in_executor(None, _ytt)

    async def _download_audio_for_transcription(self, video_url: str, video_id: str, low_bitrate: bool = False) -> Optional[str]:
        """Download audio to a temp file and return its path."""
        temp_dir = tempfile.mkdtemp(prefix=f"yt_audio_{video_id}_")

        format_selector = '139/249/bestaudio[abr<=64]/bestaudio/best' if low_bitrate else 'bestaudio/best'
        ydl_opts = {
            'format': format_selector,
            'outtmpl': os.path.join(temp_dir, f'{video_id}.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
        }

        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])

        try:
            await asyncio.get_event_loop().run_in_executor(None, _download)
            files = glob.glob(os.path.join(temp_dir, f"{video_id}.*"))
            if not files:
                shutil.rmtree(temp_dir, ignore_errors=True)
                return None
            return files[0]
        except Exception:
            shutil.rmtree(temp_dir, ignore_errors=True)
            return None

    async def _fetch_whisper_transcript(self, video_url: str) -> str:
        """
        Tier 2: Download audio and use Groq Whisper Large v3.
        """
        video_id = self.extract_video_id(video_url)
        if not video_id or not self.groq_client:
            return ""

        now_ts = time.time()
        if now_ts < self._groq_cooldown_until:
            return ""

        temp_audio = await self._download_audio_for_transcription(video_url, video_id, low_bitrate=True)
        if not temp_audio:
            return ""

        try:
            if not os.path.exists(temp_audio):
                return ""

            with open(temp_audio, "rb") as file:
                transcription = self.groq_client.audio.transcriptions.create(
                    file=(os.path.basename(temp_audio), file.read()),
                    model="whisper-large-v3",
                    response_format="text"
                )

            return transcription
        except Exception as e:
            print(f"Whisper processing error: {e}")
            err_text = str(e).lower()
            if "rate limit" in err_text or "429" in err_text or "rate_limit_exceeded" in err_text:
                # Respect provider cooldown and skip Groq for a few minutes.
                self._groq_cooldown_until = time.time() + 210
            return ""
        finally:
            temp_dir = os.path.dirname(temp_audio)
            shutil.rmtree(temp_dir, ignore_errors=True)

    async def _fetch_local_whisper_transcript(self, video_url: str) -> str:
        """
        Tier 3: Local faster-whisper fallback for multilingual transcription.
        """
        if not self.local_whisper_available:
            return ""

        video_id = self.extract_video_id(video_url)
        if not video_id:
            return ""

        temp_audio = await self._download_audio_for_transcription(video_url, video_id)
        if not temp_audio:
            return ""

        try:
            model = self._WhisperModel("tiny", device="cpu", compute_type="int8")
            segments, _ = model.transcribe(temp_audio, task="transcribe", beam_size=1, best_of=1, vad_filter=False)
            text_chunks = [seg.text.strip() for seg in segments if seg.text and seg.text.strip()]
            return " ".join(text_chunks)
        except BaseException as e:
            print(f"Local whisper transcription error: {e}")
            return ""
        finally:
            temp_dir = os.path.dirname(temp_audio)
            shutil.rmtree(temp_dir, ignore_errors=True)

# Singleton instance
youtube_service = YouTubeService()

# Maintain backward compatibility for existing routes
async def extract_playlist_videos(url: str):
    return await youtube_service.get_playlist_videos(url)

async def get_video_transcript(url: str, prefer_local: bool = False):
    return await youtube_service.get_transcript(url, prefer_local=prefer_local)

def normalize_youtube_watch_url(url: Optional[str]) -> Optional[str]:
    return YouTubeService.normalize_watch_url(url)

