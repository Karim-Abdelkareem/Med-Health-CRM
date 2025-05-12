# MedHealth-CRM Dashboard Overview

## Introduction

The MedHealth-CRM Dashboard provides a comprehensive overview of key metrics, activities, and performance indicators for users of the system. The dashboard is designed to be role-specific, showing relevant information based on the user's role in the organization.

## Dashboard Components

### 1. Key Performance Indicators (KPI)

#### KPI Summary Card
- **Current KPI Score**: Shows the user's current KPI score (out of 100)
- **KPI Status**: Visual indicator showing if KPI is on track (≥85%) or at risk (<85%)
- **Monthly Target**: Shows the required 85% completion target
- **Current Achievement**: Shows the current month's achievement percentage

#### KPI Chart
- **Monthly Comparison**: Bar chart showing target vs. achieved KPI for each month
- **Trend Line**: Line chart showing KPI trend over the past 6 months
- **Year-to-Date Performance**: Overall KPI performance for the current year

### 2. Location Visit Metrics

#### Visit Summary Card
- **Total Required Visits**: Shows the total required visits (26 days × 12 locations = 312)
- **Completed Visits**: Number of completed location visits in the current month
- **Completion Rate**: Percentage of required visits completed
- **Remaining Visits**: Number of visits still needed to reach the 85% threshold

#### Visit Calendar
- **Monthly View**: Calendar showing planned and completed visits
- **Color Coding**: Different colors for completed, pending, and missed visits
- **Quick Actions**: Ability to mark visits as completed or add notes

### 3. Plan Management

#### Current Plans
- **Active Plans**: Number of active plans for the current month
- **Upcoming Plans**: Plans scheduled for the next 7 days
- **Plan Approval Status**: Visual indicators for pending, approved, and rejected plans

#### Plan Actions
- **Create Plan**: Quick access to create a new plan
- **Edit Plan**: Edit existing plans
- **View Details**: View detailed information about each plan

### 4. Notifications Center

#### Notification Summary
- **Unread Notifications**: Count of unread notifications
- **Priority Notifications**: Highlighting high-priority notifications
- **Notification Categories**: Filtering by plan updates, messages, and holiday requests

#### Recent Notifications
- **List View**: Recent notifications with timestamp and priority indicators
- **Quick Actions**: Mark as read, archive, or take action on notifications

### 5. Holiday Management

#### Holiday Summary
- **Remaining Holidays**: Number of holiday days remaining (out of 27)
- **Upcoming Holidays**: Any approved upcoming holidays
- **Holiday Requests**: Status of pending holiday requests

#### Holiday Actions
- **Request Holiday**: Quick access to request a new holiday
- **View History**: View history of past holidays taken

### 6. User Activity

#### Recent Activities
- **Activity Log**: Recent user activities (logins, plan creations, etc.)
- **Activity Timeline**: Visual timeline of user activities

#### Team Activities (for managers)
- **Team Overview**: Summary of team members' activities
- **Team KPI**: Comparison of KPI scores across team members

## Role-Specific Dashboard Views

### Regular User (R)
- Focus on personal KPI and location visits
- Plan management for own plans
- Personal notifications and holiday management

### Line Manager (LM)
- Team overview showing subordinates' KPIs
- Approval queue for plans and holiday requests
- Team performance metrics and comparisons

### Area Manager (Area)
- Regional performance metrics
- Area-wide KPI comparison
- Location visit heat map for the area

### District Manager (DM)
- District-wide performance metrics
- Cross-team KPI comparison
- Resource allocation overview

### General Manager (GM)
- Company-wide performance dashboard
- Executive summary of all KPIs
- Strategic planning tools

### HR Manager (HR)
- Employee performance overview
- Holiday management across the organization
- KPI-based performance evaluation tools

### Admin (ADMIN)
- System-wide metrics and usage statistics
- User management overview
- Configuration and settings access

## Technical Implementation

The dashboard is implemented using:

1. **Backend API Endpoints**:
   - `/api/dashboard` - Main dashboard data
   - `/api/dashboard/preferences` - User dashboard preferences
   - `/api/dashboard/activities` - User activities
   - `/api/dashboard/notifications` - Dashboard notifications

2. **Data Sources**:
   - User data (from User model)
   - Plan data (from Plan model)
   - Location visit data (from locations in Plan model)
   - Notification data (from Notification model)
   - Holiday data (from Holiday model)

3. **Real-time Updates**:
   - Dashboard data refreshes automatically
   - Push notifications for important updates

## Dashboard Customization

Users can customize their dashboard by:

1. **Theme Selection**: Choose between light and dark themes
2. **Widget Arrangement**: Rearrange dashboard widgets based on preference
3. **Notification Settings**: Configure notification preferences
4. **Language Selection**: Switch between available languages

## Mobile Responsiveness

The dashboard is fully responsive and optimized for:
- Desktop browsers
- Tablets
- Mobile devices

## Future Enhancements

Planned future enhancements include:
1. **Advanced Analytics**: Deeper insights into performance metrics
2. **Predictive KPI**: AI-based predictions of future KPI performance
3. **Team Collaboration Tools**: Enhanced team communication features
4. **Custom Reports**: User-defined custom reports and exports
5. **Integration with External Systems**: Calendar and email integrations
