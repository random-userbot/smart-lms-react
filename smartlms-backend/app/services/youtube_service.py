"""
Smart LMS - YouTube Service
Extract playlist videos using yt-dlp
"""

import asyncio
import re
from typing import List, Dict


async def extract_playlist_videos(playlist_url: str) -> List[Dict]:
    """Extract video info from a YouTube playlist URL"""
    try:
        import yt_dlp

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
        }

        videos = []

        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(playlist_url, download=False)

                if "entries" in info:
                    # It's a playlist
                    for entry in info["entries"]:
                        if entry:
                            videos.append({
                                "title": entry.get("title", "Untitled"),
                                "url": f"https://www.youtube.com/watch?v={entry.get('id', '')}",
                                "thumbnail": entry.get("thumbnails", [{}])[-1].get("url") if entry.get("thumbnails") else None,
                                "duration": entry.get("duration", 0),
                                "description": entry.get("description", ""),
                            })
                else:
                    # Single video
                    videos.append({
                        "title": info.get("title", "Untitled"),
                        "url": playlist_url,
                        "thumbnail": info.get("thumbnails", [{}])[-1].get("url") if info.get("thumbnails") else None,
                        "duration": info.get("duration", 0),
                        "description": info.get("description", ""),
                    })

        await asyncio.get_event_loop().run_in_executor(None, _extract)
        return videos

    except ImportError:
        raise Exception("yt-dlp not installed. Install with: pip install yt-dlp")
    except Exception as e:
        raise Exception(f"Failed to extract playlist: {str(e)}")


async def get_video_transcript(video_url: str) -> str:
    """Get transcript for a YouTube video"""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        # Extract video ID
        video_id = None
        patterns = [
            r"(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})",
        ]
        for pattern in patterns:
            match = re.search(pattern, video_url)
            if match:
                video_id = match.group(1)
                break

        if not video_id:
            return ""

        def _get_transcript():
            try:
                # youtube-transcript-api v1.x uses object-oriented API
                ytt_api = YouTubeTranscriptApi()
                fetched = ytt_api.fetch(video_id)
                return " ".join([snippet.text for snippet in fetched])
            except Exception:
                return ""

        return await asyncio.get_event_loop().run_in_executor(None, _get_transcript)

    except ImportError:
        return ""


async def get_quiz_generation_service():
    """Placeholder for quiz generation from transcripts"""
    pass
