# Implementation Plan: File-Specific Permissions for Google and Microsoft

## General Overview
1. **Front-End**:
   - Add file picker integrations for Google and Microsoft.
   - Handle file-specific permissions and collect `fileId` for backend operations.
   - Store `fileId` and relevant metadata for user-authorized files.

---
---

## Steps for Microsoft Integration

### Front-End
1. **Add Microsoft File Picker Integration**:
   - Include the Microsoft OneDrive Picker SDK:
     ```html
     <script src="https://js.live.net/v7.2/OneDrive.js"></script>
     ```
   - Initialize the Picker:
     ```javascript
     function openMicrosoftPicker(accessToken, callback) {
         const odOptions = {
             clientId: "YOUR_CLIENT_ID",
             action: "share",
             success: function (files) {
                 const fileId = files.value[0].id;
                 callback(fileId);
             },
             cancel: function () {
                 console.log("User canceled file picker.");
             },
             error: function (e) {
                 console.error("Error in file picker:", e);
             }
         };
         OneDrive.open(odOptions);
     }
     ```
   - Trigger the Picker if the file from a pasted URL is unauthorized.

2. **Update Metadata Workflow**:
   - Use the `fileId` to fetch workbook metadata via Microsoft Graph API (`/me/drive/items/{fileId}/workbook`).


