// Test script for KPI calculation
import fetch from 'node-fetch';

// Base URL for the API
const baseUrl = 'http://localhost:3000/api/v1';

// Function to login and get token
async function login() {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'password123',
    }),
  });

  const data = await response.json();
  return data.token;
}

// Function to test the completed visits KPI endpoint
async function testCompletedVisitsKPI(token) {
  try {
    // Test with current month
    const response = await fetch(`${baseUrl}/users/kpi/completed-visits`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log('KPI Calculation Result:');
    console.log(JSON.stringify(data, null, 2));

    // Test with specific month and year
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // JS months are 0-indexed
    const year = currentDate.getFullYear();

    const responseWithParams = await fetch(
      `${baseUrl}/users/kpi/completed-visits?month=${month}&year=${year}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const dataWithParams = await responseWithParams.json();
    console.log('KPI Calculation Result with specific month and year:');
    console.log(JSON.stringify(dataWithParams, null, 2));

    return true;
  } catch (error) {
    console.error('Error testing KPI calculation:', error);
    return false;
  }
}

// Main function to run the tests
async function runTests() {
  try {
    console.log('Logging in...');
    const token = await login();
    
    if (!token) {
      console.error('Failed to login. Check credentials.');
      return;
    }
    
    console.log('Testing completed visits KPI calculation...');
    await testCompletedVisitsKPI(token);
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();
