import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

export function SplineScene({ scene, className }) {
    return (
        <Suspense
            fallback={
                <div className="w-full h-full flex items-center justify-center text-white">
                    <span className="loader">Loading 3D Scene...</span>
                </div>
            }
        >
            <Spline
                scene={scene}
                className={className}
            />
        </Suspense>
    )
}
