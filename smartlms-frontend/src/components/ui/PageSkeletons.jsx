import React from 'react';

function Pulse({ className = '' }) {
    return <div className={`animate-pulse rounded-xl bg-surface-elevated/80 ${className}`} />;
}

export function HeroSkeleton() {
    return (
        <div className="rounded-4xl border border-border p-8 md:p-10 bg-surface shadow-sm">
            <Pulse className="h-4 w-40 mb-4" />
            <Pulse className="h-10 w-72 mb-3" />
            <Pulse className="h-5 w-full max-w-xl" />
        </div>
    );
}

export function SectionHeaderSkeleton() {
    return (
        <div className="space-y-3">
            <Pulse className="h-8 w-64" />
            <Pulse className="h-4 w-96" />
        </div>
    );
}

export function CardsGridSkeleton({ count = 4 }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-border bg-surface p-6">
                    <Pulse className="h-6 w-3/5 mb-3" />
                    <Pulse className="h-4 w-2/3 mb-6" />
                    <Pulse className="h-3 w-full mb-2" />
                    <Pulse className="h-3 w-11/12 mb-2" />
                    <Pulse className="h-3 w-10/12" />
                </div>
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 6 }) {
    return (
        <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
            <Pulse className="h-10 w-full" />
            {Array.from({ length: rows }).map((_, i) => (
                <Pulse key={i} className="h-12 w-full" />
            ))}
        </div>
    );
}

export function AnalyticsPageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
            <SectionHeaderSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 rounded-3xl border border-border bg-surface p-8 space-y-4">
                    <Pulse className="h-16 w-40" />
                    <Pulse className="h-4 w-36" />
                    <Pulse className="h-8 w-52" />
                </div>
                <div className="lg:col-span-3">
                    <CardsGridSkeleton count={4} />
                </div>
            </div>
            <CardsGridSkeleton count={4} />
            <TableSkeleton rows={5} />
        </div>
    );
}

export function CoursePageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <HeroSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <SectionHeaderSkeleton />
                    <TableSkeleton rows={6} />
                </div>
                <div className="space-y-4">
                    <SectionHeaderSkeleton />
                    <CardsGridSkeleton count={3} />
                </div>
            </div>
        </div>
    );
}

export function CoursesPageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <HeroSkeleton />
            <Pulse className="h-14 w-full" />
            <CardsGridSkeleton count={6} />
        </div>
    );
}

export function AdminPageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <SectionHeaderSkeleton />
            <TableSkeleton rows={8} />
        </div>
    );
}
