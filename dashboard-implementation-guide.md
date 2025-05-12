# MedHealth-CRM Dashboard Implementation Guide

## Overview

This guide provides instructions for implementing the MedHealth-CRM Dashboard as described in the dashboard-overview.md document. The implementation follows a modular approach, allowing for incremental development and testing.

## Backend Implementation

### 1. Dashboard Controller

The dashboard controller (`src/module/dashboard/dashboardController.js`) has been implemented with the following endpoints:

- `getDashboardData`: Retrieves all dashboard data for the current user
- `updatePreferences`: Updates user dashboard preferences
- `addActivity`: Adds a new activity to the user's activity log
- `getNotifications`: Retrieves dashboard notifications
- `updateNotificationStatus`: Updates the status of a notification

### 2. Dashboard Routes

The dashboard routes (`src/module/dashboard/dashboardRoutes.js`) have been configured and connected to the Express application in `app.js`.

### 3. Dashboard Model

The dashboard model (`src/module/dashboard/dashboardModel.js`) defines the schema for storing dashboard-related data:

- User preferences
- Recent activities
- Dashboard-specific notifications

## Frontend Implementation (To Be Developed)

### 1. Dashboard Layout

Create a responsive dashboard layout with the following components:

```jsx
// Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Container, Grid, Box } from '@mui/material';
import KPIWidget from './widgets/KPIWidget';
import VisitMetricsWidget from './widgets/VisitMetricsWidget';
import PlanManagementWidget from './widgets/PlanManagementWidget';
import NotificationsWidget from './widgets/NotificationsWidget';
import HolidayWidget from './widgets/HolidayWidget';
import ActivityWidget from './widgets/ActivityWidget';
import api from '../services/api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/dashboard');
        setDashboardData(response.data.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Set up a refresh interval
    const interval = setInterval(fetchDashboardData, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard: {error}</div>;
  if (!dashboardData) return <div>No dashboard data available</div>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ flexGrow: 1, py: 3 }}>
        <Grid container spacing={3}>
          {/* KPI Section */}
          <Grid item xs={12} md={6}>
            <KPIWidget data={dashboardData.user} monthlyKPI={dashboardData.monthlyKPI} />
          </Grid>
          
          {/* Visit Metrics Section */}
          <Grid item xs={12} md={6}>
            <VisitMetricsWidget statistics={dashboardData.statistics} />
          </Grid>
          
          {/* Plan Management Section */}
          <Grid item xs={12} md={6}>
            <PlanManagementWidget activePlans={dashboardData.statistics.activePlans} />
          </Grid>
          
          {/* Notifications Section */}
          <Grid item xs={12} md={6}>
            <NotificationsWidget unreadCount={dashboardData.statistics.unreadNotifications} />
          </Grid>
          
          {/* Holiday Management Section */}
          <Grid item xs={12} md={6}>
            <HolidayWidget remainingHolidays={dashboardData.statistics.remainingHolidays} />
          </Grid>
          
          {/* User Activity Section */}
          <Grid item xs={12} md={6}>
            <ActivityWidget activities={dashboardData.recentActivities} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
```

### 2. Dashboard Widgets

Implement the following widget components:

1. **KPI Widget**: Displays KPI summary and charts
2. **Visit Metrics Widget**: Shows location visit statistics
3. **Plan Management Widget**: Displays plan information and actions
4. **Notifications Widget**: Shows notifications and allows interactions
5. **Holiday Widget**: Displays holiday information and request options
6. **Activity Widget**: Shows recent user activities

### 3. API Service

Create an API service to interact with the backend:

```jsx
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
```

## Data Visualization

Implement charts and visualizations using a library like Chart.js or Recharts:

```jsx
// KPIChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

const KPIChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="target" fill="#8884d8" name="Target %" />
        <Bar dataKey="achieved" fill="#82ca9d" name="Achieved %" />
        <Line type="monotone" dataKey="achieved" stroke="#ff7300" name="Trend" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default KPIChart;
```

## Role-Based Dashboard Customization

Implement role-based dashboard views:

```jsx
// Dashboard.jsx (modified)
// ...

const Dashboard = () => {
  // ...existing code...

  // Determine which components to show based on user role
  const renderRoleBasedComponents = () => {
    const { role } = dashboardData.user;
    
    switch (role) {
      case 'ADMIN':
        return (
          <>
            <AdminOverviewWidget />
            <SystemStatsWidget />
          </>
        );
      case 'GM':
        return (
          <>
            <CompanyOverviewWidget />
            <ExecutiveSummaryWidget />
          </>
        );
      case 'HR':
        return (
          <>
            <EmployeePerformanceWidget />
            <HolidayManagementWidget />
          </>
        );
      case 'LM':
        return (
          <>
            <TeamOverviewWidget />
            <ApprovalQueueWidget />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ flexGrow: 1, py: 3 }}>
        <Grid container spacing={3}>
          {/* Common widgets for all roles */}
          <Grid item xs={12} md={6}>
            <KPIWidget data={dashboardData.user} monthlyKPI={dashboardData.monthlyKPI} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <VisitMetricsWidget statistics={dashboardData.statistics} />
          </Grid>
          
          {/* Role-specific widgets */}
          {renderRoleBasedComponents()}
          
          {/* More common widgets */}
          <Grid item xs={12} md={6}>
            <NotificationsWidget unreadCount={dashboardData.statistics.unreadNotifications} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ActivityWidget activities={dashboardData.recentActivities} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
```

## Testing

### Backend Testing

Test the dashboard API endpoints using tools like Postman or Jest:

1. Test `GET /api/dashboard` to ensure it returns the correct data structure
2. Test `PATCH /api/dashboard/preferences` to verify preference updates
3. Test `POST /api/dashboard/activities` to confirm activity logging
4. Test `GET /api/dashboard/notifications` to check notification retrieval
5. Test `PATCH /api/dashboard/notifications/:notificationId` to verify status updates

### Frontend Testing

Test the dashboard components using React Testing Library or Cypress:

1. Test dashboard loading and error states
2. Test widget rendering with different data inputs
3. Test user interactions (clicking buttons, filtering data)
4. Test role-based component rendering

## Deployment

1. Ensure all environment variables are properly configured
2. Build the frontend application for production
3. Deploy the backend API to your production server
4. Set up proper CORS configuration for production
5. Implement monitoring and logging for the dashboard

## Maintenance and Updates

1. Regularly review dashboard performance metrics
2. Gather user feedback for improvements
3. Update visualizations and metrics as business needs evolve
4. Monitor for any security vulnerabilities in dependencies
