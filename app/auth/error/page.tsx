"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

const ErrorPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")
  
  // Log error details for debugging
  useEffect(() => {
    console.error('Auth Error:', {
      error,
      errorCode,
      errorDescription
    })
  }, [error, errorCode, errorDescription])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          Authentication Error
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">
            {errorDescription || error || 'An unknown error occurred'}
          </p>
          {errorCode && (
            <p className="text-sm text-red-500 mt-2">
              Error Code: {errorCode}
            </p>
          )}
        </div>
        <div className="space-y-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary hover:underline"
          >
            Return to Dashboard
          </button>
          <p className="text-sm text-gray-500">
            If this error persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
