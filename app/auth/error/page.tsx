import { ErrorDisplay } from '@/components/pages/ErrorDisplay'

interface Props {
  searchParams: {
    error?: string
    error_code?: string
    error_description?: string
  }
}

export default function ErrorPage({ searchParams }: Props) {
  const { error, error_code, error_description } = searchParams

  return <ErrorDisplay 
    error={error}
    errorCode={error_code}
    errorDescription={error_description}
  />
}
