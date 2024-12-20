// import { render, screen, fireEvent, waitFor } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
// import DashboardPage from '@/components/authorized/DashboardPage'
// import { processQuery } from '@/services_endpoints/process_query'
// import { processDataVisualization } from '@/services_endpoints/data_visualization'
// import { useAuth } from '@/hooks/useAuth'
// import { createClient } from '@/utils/supabase/client'
// import jest from 'jest'


// // Mock all required dependencies
// jest.mock('@/services_endpoints/process_query')
// jest.mock('@/services_endpoints/data_visualization')
// jest.mock('@/hooks/useAuth')
// jest.mock('@/utils/supabase/client')
// jest.mock('@/hooks/useFilePicker')
// jest.mock('@/services_endpoints/get_document_title')
// jest.mock('next/navigation', () => ({
//   useRouter: () => ({
//     push: jest.fn(),
//   }),
// }))

// // Mock file picker hook
// jest.mock('@/hooks/useFilePicker', () => ({
//   useFilePicker: () => ({
//     verifyFileAccess: jest.fn().mockResolvedValue({ hasPermission: true, fileInfo: { provider: 'google' } }),
//     launchPicker: jest.fn().mockResolvedValue({ success: true }),
//   }),
// }))

// describe('DashboardPage Form Submissions', () => {
//   beforeEach(() => {
//     // Reset all mocks before each test
//     jest.clearAllMocks()
    
//     // Mock auth hook
//     ;(useAuth as jest.Mock).mockReturnValue({
//       user: { id: 'test-user-id' },
//     })
    
//     // Mock Supabase client
//     ;(createClient as jest.Mock).mockReturnValue({
//       from: () => ({
//         select: () => ({
//           eq: () => ({
//             single: () => Promise.resolve({ data: null, error: null }),
//           }),
//         }),
//         upsert: () => Promise.resolve({ error: null }),
//       }),
//     })
//   })

//   describe('Main Query Processing', () => {
//     it('should submit form with correct data for file upload and download preference', async () => {
//       const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' })
//       render(<DashboardPage />)

//       // Upload file
//       const fileInput = screen.getByLabelText(/Upload Files/i)
//       await userEvent.upload(fileInput, mockFile)

//       // Enter query
//       const queryInput = screen.getByLabelText(/What can we do for you/i)
//       await userEvent.type(queryInput, 'test query')

//       // Select download preference
//       const downloadRadio = screen.getByLabelText(/Downloadable File/i)
//       await userEvent.click(downloadRadio)

//       // Select CSV format
//       const csvRadio = screen.getByLabelText(/CSV/i)
//       await userEvent.click(csvRadio)

//       // Submit form
//       const submitButton = screen.getByRole('button', { name: /Submit/i })
//       await userEvent.click(submitButton)

//       // Verify processQuery was called with correct data
//       await waitFor(() => {
//         expect(processQuery).toHaveBeenCalledWith(
//           'test query',
//           [], // No URLs
//           [mockFile],
//           {
//             type: 'download',
//             format: 'csv'
//           },
//           expect.any(Object) // AbortSignal
//         )
//       })
//     })

//     it('should submit form with correct data for URL input and online sheet preference', async () => {
//       render(<DashboardPage />)

//       // Enter URL
//       const urlInput = screen.getByPlaceholderText(/Paste Google Sheet or Excel Online URL/i)
//       await userEvent.type(urlInput, 'https://docs.google.com/spreadsheets/test')
      
//       // Wait for URL processing
//       await waitFor(() => {
//         expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument()
//       })

//       // Enter query
//       const queryInput = screen.getByLabelText(/What can we do for you/i)
//       await userEvent.type(queryInput, 'test query')

//       // Select online preference
//       const onlineRadio = screen.getByLabelText(/Online Spreadsheet/i)
//       await userEvent.click(onlineRadio)

//       // Enter destination URL
//       const destinationInput = screen.getByLabelText(/Destination/i)
//       await userEvent.type(destinationInput, 'https://docs.google.com/spreadsheets/destination')

//       // Submit form
//       const submitButton = screen.getByRole('button', { name: /Submit/i })
//       await userEvent.click(submitButton)

//       // Verify processQuery was called with correct data
//       await waitFor(() => {
//         expect(processQuery).toHaveBeenCalledWith(
//           'test query',
//           [{ url: 'https://docs.google.com/spreadsheets/test', sheet_name: expect.any(String) }],
//           [],
//           {
//             type: 'online',
//             destination_url: 'https://docs.google.com/spreadsheets/destination',
//             modify_existing: false
//           },
//           expect.any(Object) // AbortSignal
//         )
//       })
//     })
//   })

//   describe('Data Visualization', () => {
//     it('should submit visualization form with correct data for URL input', async () => {
//       render(<DashboardPage />)

//       // Expand visualization section
//       const expandButton = screen.getByText(/Visualize Your Data/i)
//       await userEvent.click(expandButton)

//       // Enter URL
//       const urlInput = screen.getByLabelText(/Sheet URL/i)
//       await userEvent.type(urlInput, 'https://docs.google.com/spreadsheets/test')

//       // Select color
//       const blueColor = screen.getByLabelText(/blue/i)
//       await userEvent.click(blueColor)

//       // Select surprise me option
//       const surpriseOption = screen.getByLabelText(/Surprise Me/i)
//       await userEvent.click(surpriseOption)

//       // Submit form
//       const submitButton = screen.getByRole('button', { name: /Generate Visualization/i })
//       await userEvent.click(submitButton)

//       // Verify processDataVisualization was called with correct data
//       await waitFor(() => {
//         expect(processDataVisualization).toHaveBeenCalledWith(
//           {
//             url: 'https://docs.google.com/spreadsheets/test',
//             sheet_name: expect.any(String)
//           },
//           {
//             color_palette: 'blue',
//             custom_instructions: undefined
//           }
//         )
//       })
//     })

//     it('should submit visualization form with correct data for file upload', async () => {
//       const mockFile = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
//       render(<DashboardPage />)

//       // Expand visualization section
//       const expandButton = screen.getByText(/Visualize Your Data/i)
//       await userEvent.click(expandButton)

//       // Upload file
//       const fileInput = screen.getByLabelText(/Upload File/i)
//       await userEvent.upload(fileInput, mockFile)

//       // Select color
//       const redColor = screen.getByLabelText(/red/i)
//       await userEvent.click(redColor)

//       // Select custom instructions
//       const customOption = screen.getByLabelText(/Give Custom Instructions/i)
//       await userEvent.click(customOption)

//       // Enter custom instructions
//       const instructionsInput = screen.getByPlaceholderText(/Create a bar chart/i)
//       await userEvent.type(instructionsInput, 'Create a line graph showing sales trends')

//       // Submit form
//       const submitButton = screen.getByRole('button', { name: /Generate Visualization/i })
//       await userEvent.click(submitButton)

//       // Verify processDataVisualization was called with correct data
//       await waitFor(() => {
//         expect(processDataVisualization).toHaveBeenCalledWith(
//           {
//             file: mockFile
//           },
//           {
//             color_palette: 'red',
//             custom_instructions: 'Create a line graph showing sales trends'
//           }
//         )
//       })
//     })
//   })
// }) 