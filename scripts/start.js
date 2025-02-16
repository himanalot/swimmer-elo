const { exec } = require('child_process');
const os = require('os');

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Determine the platform
const platform = os.platform();

// Set the browser based on platform
const browser = platform === 'darwin' ? 'safari' : 'chrome';

// Set the environment variables and start the app
process.env.BROWSER = browser;
process.env.HOST = getLocalIpAddress(); // Enable network access
require('react-scripts/scripts/start'); 