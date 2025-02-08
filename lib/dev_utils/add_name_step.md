# Sign Up Flow: Add Name Step Implementation

## Overview
Add first name, last name, and organization name as a separate step in the sign up flow, with a similar UI in the user account page.

## Implementation Steps

### 1. Complete auth/names page.tsx, Names.tsx component, and useNames hook
1.1. Page:
- Position page before setup permissions step right after sign up
1.2. Hook:
- Auto-create user_profile and user_usage records on component mount if non-existent
- User should be directed to auth/setup-permissions after auth/names
1.3. Component:
- First Name: Optional
- Last Name: Optional
- Organization: Required


### 2. Organization Handling
2.1. ✅ "No Organization" option available
2.2. Show input field when "No Organization" is unchecked
2.3. Implement debounced search for organization suggestions that show in a drop down like interface
2.4. Auto-create organization if user enters unique name

### 3. Additional Tasks
3.1. Implement a similar UI in the user account page
- display organization name on component mount
- add an edit button in the names area that allows the user to edit first last and organzition
- same debounced search or organization creation for organization UI
