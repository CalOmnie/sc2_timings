// Debug script to add better error handling to the loadSC2Data function
// This will be injected into the built JavaScript

const originalLoadSC2Data = `
    async loadSC2Data() {
        try {
            console.log('Attempting to load SC2 data from api/sc2-data.json');
            console.log('Current location:', window.location.href);
            console.log('Base URL would be:', new URL('api/sc2-data.json', window.location.href).href);
            
            const response = await fetch('api/sc2-data.json');
            console.log('Fetch response status:', response.status);
            console.log('Fetch response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(\`HTTP error! status: \${response.status}\`);
            }
            
            const data = await response.json();
            this.sc2Data = data;
            console.log('SC2 data loaded successfully:', Object.keys(data));
            
            if (data.races) {
                console.log('Available races:', Object.keys(data.races));
            }
        } catch (error) {
            console.error('Failed to load SC2 data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                currentURL: window.location.href
            });
            
            // Try alternative paths
            console.log('Trying alternative paths...');
            try {
                const altResponse = await fetch('./api/sc2-data.json');
                if (altResponse.ok) {
                    this.sc2Data = await altResponse.json();
                    console.log('SC2 data loaded from alternative path');
                    return;
                }
            } catch (altError) {
                console.error('Alternative path also failed:', altError);
            }
            
            // Show user-friendly error
            alert('Failed to load game data. Please check the browser console for details.');
        }
    }`;

console.log('Debug version of loadSC2Data function:');
console.log(originalLoadSC2Data);