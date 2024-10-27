"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

const ErrorPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rawError = searchParams.get("error")
  
  // Extract meaningful error message
  const errorMessage = (() => {
    if (!rawError) return 'An unknown error occurred';
    
    // Check for specific error patterns
    if (rawError.includes('User already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    
    // Remove any "Internal Server Error:" prefix
    return rawError.replace('Internal Server Error:', '').trim();
  })();
  
  const isUserExistsError = errorMessage.toLowerCase().includes('already exists');
  
  useEffect(() => {
    if (isUserExistsError) {
      router.push('/auth/signin?message=Account already exists. Please sign in.');
    }
  }, [isUserExistsError, router]);

  // Debug log
  console.log('Raw error:', rawError);
  console.log('Processed error message:', errorMessage);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">
          {isUserExistsError ? 'Account Already Exists' : 'Authentication Error'}
        </h1>
        {/* <p className="text-gray-600">
          {errorMessage}
        </p> */}
        <div className="space-y-4">
          <p className="text-gray-600">
            Already have an account?{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
