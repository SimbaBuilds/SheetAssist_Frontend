## Data Visualization Feature

Relevant files: @DashboardPage, @useDashboard, @data_visualization.ts, useDataVisualization.ts, @download_file.ts, @api.ts

Front end requirements:
1. Underneath the main UI in the dashboard, I want a secondary data visualization UI that only expands/shows on click.  It should have input file and url fields identical to the ones in the main UI but limit one total input btw both url and file.  For this UI, all validation and functionality for the input url should be the same for the input url fields in the main UI, but the only options for file attachment are .xlsx and .csv.  

2. Under the input file/url fields, the user should have the option to choose from a color palette that consists of all of the colors that matplotlib is capable of producing. Matplotlib is what the backend will use to produce the visualizations.  

3. Under the color palette selection, the user should have the options “Surprise Me” or “give custom instructions”.  Surprise Me will immediately send a data visualization request to the backend with form data: (1)url or file (2) color palette selection.  Give custom instructions should have an input text field where the user can specify instructions about the type and style of visualization they want produced.  On submit for this option, form data will be the same but with the custom instructions included.   

4. The response from the backend will contain the image.  I want this image displayed on the Dashboard Page.  The image should have a download button display on hover.  When the download button is clicked, the file should download to the user's machine.


