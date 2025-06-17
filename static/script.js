// Clinical ranges for biomarkers
const clinicalRanges = {
    'total-cholesterol': { min: 0, max: 200, unit: 'mg/dL' },
    'ldl': { min: 0, max: 100, unit: 'mg/dL' },
    'hdl': { min: 60, max: null, unit: 'mg/dL' },
    'triglycerides': { min: 0, max: 150, unit: 'mg/dL' },
    'creatinine': { min: 0.7, max: 1.3, unit: 'mg/dL' },
    'vitamin-d': { min: 30, max: 100, unit: 'ng/mL' },
    'vitamin-b12': { min: 200, max: 900, unit: 'pg/mL' },
    'hba1c': { min: 0, max: 5.7, unit: '%' }
};

// Sample data
const sampleData = {
    'total-cholesterol': [
        { date: '2023-01-01', value: 180 },
        { date: '2023-02-01', value: 175 },
        { date: '2023-03-01', value: 185 }
    ],
    'ldl': [
        { date: '2023-01-01', value: 90 },
        { date: '2023-02-01', value: 85 },
        { date: '2023-03-01', value: 95 }
    ],
    'hdl': [
        { date: '2023-01-01', value: 65 },
        { date: '2023-02-01', value: 70 },
        { date: '2023-03-01', value: 68 }
    ],
    'triglycerides': [
        { date: '2023-01-01', value: 120 },
        { date: '2023-02-01', value: 130 },
        { date: '2023-03-01', value: 125 }
    ],
    'creatinine': [
        { date: '2023-01-01', value: 1.0 },
        { date: '2023-02-01', value: 1.1 },
        { date: '2023-03-01', value: 1.05 }
    ],
    'vitamin-d': [
        { date: '2023-01-01', value: 45 },
        { date: '2023-02-01', value: 50 },
        { date: '2023-03-01', value: 48 }
    ],
    'vitamin-b12': [
        { date: '2023-01-01', value: 450 },
        { date: '2023-02-01', value: 480 },
        { date: '2023-03-01', value: 460 }
    ],
    'hba1c': [
        { date: '2023-01-01', value: 5.5 },
        { date: '2023-02-01', value: 5.4 },
        { date: '2023-03-01', value: 5.6 }
    ]
};

// Current data state
let biomarkerData = {};

// Chart initialization
let biomarkerChart = null;

function initializeChart() {
    const ctx = document.getElementById('biomarker-chart').getContext('2d');
    
    biomarkerChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Update chart with selected biomarker data
function updateChart(biomarker) {
    if (biomarker === 'all') {
        updateAllBiomarkersChart();
        return;
    }

    if (!biomarkerData[biomarker]) return;

    const data = biomarkerData[biomarker];
    const range = clinicalRanges[biomarker];

    biomarkerChart.data.labels = data.map(d => d.date);
    biomarkerChart.data.datasets = [{
        label: biomarker.charAt(0).toUpperCase() + biomarker.slice(1),
        data: data.map(d => d.value),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
        tension: 0.4
    }];

    // Add reference lines for normal range
    if (range) {
        biomarkerChart.data.datasets.push({
            label: 'Normal Range',
            data: data.map(() => range.max),
            borderColor: '#4caf50',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
        });
    }

    biomarkerChart.update();
}

// Update chart with all biomarkers
function updateAllBiomarkersChart() {
    const dates = [...new Set(Object.values(biomarkerData).flatMap(data => data.map(d => d.date)))].sort();
    
    biomarkerChart.data.labels = dates;
    biomarkerChart.data.datasets = Object.entries(biomarkerData).map(([biomarker, data]) => ({
        label: biomarker.charAt(0).toUpperCase() + biomarker.slice(1),
        data: dates.map(date => {
            const point = data.find(d => d.date === date);
            return point ? point.value : null;
        }),
        borderColor: getRandomColor(),
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4
    }));

    biomarkerChart.update();
}

// Generate random color for chart lines
function getRandomColor() {
    const colors = [
        '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
        '#00796b', '#c2185b', '#5d4037', '#455a64', '#ffa000'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Update biomarker cards
function updateBiomarkerCards() {
    Object.entries(biomarkerData).forEach(([biomarker, data]) => {
        const card = document.getElementById(`${biomarker}-card`);
        if (!card) return;

        const latestValue = data[data.length - 1];
        const range = clinicalRanges[biomarker];
        
        if (latestValue) {
            const valueElement = card.querySelector('.value');
            valueElement.textContent = `${latestValue.value} ${range.unit}`;
            
            // Add color coding based on normal range
            if (range) {
                const isAbnormal = range.max ? 
                    latestValue.value > range.max || latestValue.value < range.min :
                    latestValue.value < range.min;
                
                valueElement.style.color = isAbnormal ? '#d32f2f' : '#4caf50';
            }
        }
    });
}

// Load sample data
function loadSampleData() {
    biomarkerData = JSON.parse(JSON.stringify(sampleData));
    updateBiomarkerCards();
    updateChart('all');
}

// Handle file upload
const fileUpload = document.getElementById('file-upload');
const selectedFile = document.getElementById('selected-file');
const processButton = document.getElementById('process-button');
let selectedPDFFile = null;

fileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (file.type === 'application/pdf') {
            selectedPDFFile = file;
            selectedFile.textContent = file.name;
            processButton.disabled = false;
        } else {
            alert('Please select a PDF file');
            fileUpload.value = '';
            selectedFile.textContent = 'No file chosen';
            processButton.disabled = true;
            selectedPDFFile = null;
        }
    }
});

processButton.addEventListener('click', async () => {
    if (!selectedPDFFile) return;

    const formData = new FormData();
    formData.append('file', selectedPDFFile);

    try {
        processButton.disabled = true;
        processButton.textContent = 'Processing...';
        
        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const data = await response.json();
        
        // Update biomarker data with new values
        Object.entries(data).forEach(([biomarker, values]) => {
            if (!biomarkerData[biomarker]) {
                biomarkerData[biomarker] = [];
            }
            biomarkerData[biomarker].push(...values);
        });
        
        // Update the UI
        updateBiomarkerCards();
        updateChart('all');
        
        // Reset the upload state
        fileUpload.value = '';
        selectedFile.textContent = 'No file chosen';
        selectedPDFFile = null;
        
    } catch (error) {
        console.error('Error uploading file:', error);
        alert(error.message || 'Error uploading file. Please try again.');
    } finally {
        processButton.disabled = false;
        processButton.textContent = 'Process Report';
    }
});

// Handle date range changes
document.getElementById('start-date').addEventListener('change', () => {
    // Filter data based on date range
    updateChart('all');
});

document.getElementById('end-date').addEventListener('change', () => {
    // Filter data based on date range
    updateChart('all');
});

// Handle biomarker selection
document.querySelectorAll('.biomarker-nav a').forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const biomarker = event.target.dataset.biomarker;
        if (biomarker) {
            updateChart(biomarker);
        }
    });
});

// Handle sample data loading
document.getElementById('load-sample').addEventListener('click', (event) => {
    event.preventDefault();
    loadSampleData();
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    // Don't show any data initially
    biomarkerChart.data.labels = [];
    biomarkerChart.data.datasets = [];
    biomarkerChart.update();
});