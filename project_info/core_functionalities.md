#Core Functionalities

This is the front end of a AI productively/workflow application.  It accepts user requests asking to perform actions on files and spreadsheets and sends this form data to a Python backend which creates a sandbox environment, runs AI generated code, and returns data of type dataframe, string, pdf file, etc...

1. Landing Page
    1. Title: "Sheet Assist"
    2. “AI tool for your spreadsheets, pdfs, text documents, and images!  Integrate with your Google and Microsoft services.  Instantly transfer images to spreadsheets.  Combine/convert spreadsheets and pdfs.”
    3. Pricing: 
        1. Free membership: 10 tasks/mo.  
        2. $10 base: 200 requests in a month -- two week free trial
        3. $20 pro: 1000 requests a month
        

2. User Dashboard
    1. File or URL Input Fields (user must populate at least one)
        1. File field:(up to 10 files with max file size 10MB each) of type .xlsx, .csv, .json, .docx, .txt, ,pdf, .jpeg, or .png 
        2. URL field (up to 10 URLs): excel for web, word online, google sheets, or google docs URL
    2. User query field (required)
        1. Text input field for user query (max 500 characters)
        2. "Don't know what to ask -- look at these examples" -- on click -- pop up window with the following example requests:
                “Add this receipt to the sheet”
                “Match the student number to populate the grades sheet with phone numbers from the household contacts sheet”
                Convert this pdf to a sheet with headers “teacher” “course load”
                “Combine these pdfs into one large pdf and sort the pages alphabetically by last name”
                “Extract all unpaid invoices from the finance sheet”
                “Match client ID from the contract sheet to populate missing addresses in the billing sheet”
                Convert this directory of legal case PDFs into a single document and create a table of contents by case name”
                “Pull employee contact info from the HR sheet and create a phone directory sorted by department”
                “Add new clients from this CSV to the existing CRM sheet, avoiding duplicates by matching email addresses”
                “Extract contact information for all vendors and group by service type from the procurement sheet”
                “Create a performance summary by combining employee evaluation scores from each department sheet”
                “Generate a summary of outstanding balances by client from the accounts receivable sheet and sort by due date”
                “Filter and count items sold per category in the product sales sheet, summarizing by month”
    3. Output selection: 2 option radio group (select 1) --- get downloadable file or add to online spreadsheet or document (URL  field - defaulted to input URL if populated) -- "Note: your original google or excel sheet will not be modified -- a new sheet will be added to your existing workbook"