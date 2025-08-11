// Modern Health Census JavaScript
// ================================

// DOM Elements
const addPatientButton = document.getElementById("addPatient");
const report = document.getElementById("report");
const btnSearch = document.getElementById('btnSearch');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNav = document.getElementById('mobileNav');
const loadingOverlay = document.getElementById('loadingOverlay');

// Data Storage
const patients = JSON.parse(localStorage.getItem('patients')) || [];
let todayPatients = 0;
let chartInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateReport();
    updateLiveStats();
    initializeChart();
});

// Initialize App
function initializeApp() {
    // Check for today's patients
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('lastVisitDate');
    
    if (storedDate !== today) {
        localStorage.setItem('lastVisitDate', today);
        localStorage.setItem('todayPatients', '0');
        todayPatients = 0;
    } else {
        todayPatients = parseInt(localStorage.getItem('todayPatients') || '0');
    }
    
    // Update UI
    updateTodayCount();
}

// Setup Event Listeners
function setupEventListeners() {
    // Add Patient Button
    if (addPatientButton) {
        addPatientButton.addEventListener("click", addPatient);
    }
    
    // Search Button
    if (btnSearch) {
        btnSearch.addEventListener('click', searchCondition);
    }
    
    // Enter key for search
    const conditionInput = document.getElementById('conditionInput');
    if (conditionInput) {
        conditionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCondition();
            }
        });
    }
    
    // Mobile Menu Toggle
    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
    }
    
    // Form validation
    const patientForm = document.getElementById('patientForm');
    if (patientForm) {
        patientForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addPatient();
        });
    }
}

// Add Patient Function
function addPatient() {
    const name = document.getElementById("name").value.trim();
    const gender = document.querySelector('input[name="gender"]:checked');
    const age = document.getElementById("age").value;
    const condition = document.getElementById("condition").value;

    // Validation
    if (!name) {
        showToast("Please enter patient name", "error");
        return;
    }
    
    if (!gender) {
        showToast("Please select gender", "error");
        return;
    }
    
    if (!age || age < 1 || age > 120) {
        showToast("Please enter valid age (1-120)", "error");
        return;
    }
    
    if (!condition) {
        showToast("Please select a condition", "error");
        return;
    }

    // Show loading
    showLoading();

    // Create patient object
    const patient = {
        id: Date.now(),
        name: name,
        gender: gender.value,
        age: parseInt(age),
        condition: condition,
        date: new Date().toISOString()
    };

    // Add to array
    patients.push(patient);
    
    // Save to localStorage
    localStorage.setItem('patients', JSON.stringify(patients));
    
    // Update today's count
    todayPatients++;
    localStorage.setItem('todayPatients', todayPatients.toString());
    
    // Update UI
    setTimeout(() => {
        hideLoading();
        resetForm();
        generateReport();
        updateLiveStats();
        updateChart();
        updatePatientsTable();
        showToast(`Patient ${name} added successfully!`, "success");
        
        // Show table if hidden
        const tableSection = document.getElementById('recentPatientsSection');
        if (tableSection && patients.length > 0) {
            tableSection.style.display = 'block';
        }
    }, 500);
}

// Reset Form
function resetForm() {
    document.getElementById("name").value = "";
    const checkedGender = document.querySelector('input[name="gender"]:checked');
    if (checkedGender) {
        checkedGender.checked = false;
    }
    document.getElementById("age").value = "";
    document.getElementById("condition").value = "";
}

// Search Condition
function searchCondition() {
    const input = document.getElementById('conditionInput').value.toLowerCase().trim();
    const resultDiv = document.getElementById('result');
    const searchResultsSection = document.getElementById('searchResultsSection');
    
    if (!input) {
        showToast("Please enter a condition to search", "error");
        return;
    }
    
    resultDiv.innerHTML = '<div class="spinner"></div>';
    searchResultsSection.style.display = 'block';

    // Fetch data
    fetch('health_analysis.json')
        .then(response => response.json())
        .then(data => {
            const condition = data.conditions.find(item => 
                item.name.toLowerCase() === input || 
                item.name.toLowerCase().includes(input)
            );

            if (condition) {
                displayConditionDetails(condition, resultDiv);
            } else {
                resultDiv.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">🔍</span>
                        <p>No results found for "${input}"</p>
                        <small>Try searching for: Diabetes, Thyroid, or High Blood Pressure</small>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⚠️</span>
                    <p>An error occurred while fetching data</p>
                    <small>${error.message}</small>
                </div>
            `;
        });
}

// Display Condition Details
function displayConditionDetails(condition, container) {
    const symptomsHTML = condition.symptoms.map(s => `<li>${s}</li>`).join('');
    const preventionHTML = condition.prevention.map(p => `<li>${p}</li>`).join('');
    
    container.innerHTML = `
        <div class="condition-detail-card">
            <div class="condition-header">
                <h2>${condition.name}</h2>
            </div>
            <div class="condition-body">
                <img src="${condition.imagesrc}" alt="${condition.name}" class="condition-image" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 400 200%27%3E%3Crect fill=%27%234299e1%27 width=%27400%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27sans-serif%27 font-size=%2724%27 fill=%27white%27%3E${condition.name}%3C/text%3E%3C/svg%3E'">
                
                <div class="info-section symptoms">
                    <h3>🩺 Symptoms</h3>
                    <ul class="info-list">
                        ${symptomsHTML}
                    </ul>
                </div>
                
                <div class="info-section prevention">
                    <h3>🛡️ Prevention</h3>
                    <ul class="info-list">
                        ${preventionHTML}
                    </ul>
                </div>
                
                <div class="info-section treatment">
                    <h3>💊 Treatment</h3>
                    <p>${condition.treatment}</p>
                </div>
            </div>
        </div>
    `;
}

// Close Search Results
function closeSearchResults() {
    const searchResultsSection = document.getElementById('searchResultsSection');
    if (searchResultsSection) {
        searchResultsSection.style.display = 'none';
    }
    document.getElementById('conditionInput').value = '';
}

// Generate Report
function generateReport() {
    if (patients.length === 0) {
        report.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📊</span>
                <p>No patient data available yet</p>
                <small>Add patients to see detailed analytics</small>
            </div>
        `;
        return;
    }
    
    const numPatients = patients.length;
    const conditionsCount = {
        Diabetes: 0,
        Thyroid: 0,
        "High Blood Pressure": 0,
    };
    const genderConditionCount = {
        Male: {
            Diabetes: 0,
            Thyroid: 0,
            "High Blood Pressure": 0,
        },
        Female: {
            Diabetes: 0,
            Thyroid: 0,
            "High Blood Pressure": 0,
        },
    };

    // Calculate statistics
    for (const patient of patients) {
        conditionsCount[patient.condition]++;
        genderConditionCount[patient.gender][patient.condition]++;
    }

    // Generate HTML
    let reportHTML = `
        <div class="report-summary">
            <strong>Total Patients:</strong> ${numPatients}
        </div>
        <div class="report-divider"></div>
        <div class="conditions-breakdown">
            <h4>📊 Conditions Breakdown</h4>
    `;
    
    for (const condition in conditionsCount) {
        if (conditionsCount[condition] > 0) {
            const percentage = ((conditionsCount[condition] / numPatients) * 100).toFixed(1);
            reportHTML += `
                <div class="condition-item">
                    <span>${condition}</span>
                    <span class="condition-stats">
                        <strong>${conditionsCount[condition]}</strong> patients (${percentage}%)
                    </span>
                </div>
            `;
        }
    }

    reportHTML += `
        </div>
        <div class="report-divider"></div>
        <div class="gender-breakdown">
            <h4>👥 Gender-Based Analysis</h4>
    `;
    
    for (const gender in genderConditionCount) {
        const genderTotal = Object.values(genderConditionCount[gender]).reduce((a, b) => a + b, 0);
        if (genderTotal > 0) {
            reportHTML += `
                <div class="gender-section">
                    <div class="gender-title">${gender === 'Male' ? '👨' : '👩'} ${gender}</div>
            `;
            for (const condition in genderConditionCount[gender]) {
                if (genderConditionCount[gender][condition] > 0) {
                    reportHTML += `
                        <div class="gender-condition">
                            ${condition}: <strong>${genderConditionCount[gender][condition]}</strong>
                        </div>
                    `;
                }
            }
            reportHTML += `</div>`;
        }
    }
    
    reportHTML += `</div>`;
    report.innerHTML = reportHTML;
}

// Update Live Statistics
function updateLiveStats() {
    // Total Patients
    const totalPatientsEl = document.getElementById('totalPatients');
    if (totalPatientsEl) {
        animateNumber(totalPatientsEl, patients.length);
    }
    
    // Live Patient Count in Hero
    const livePatientCount = document.getElementById('livePatientCount');
    if (livePatientCount) {
        animateNumber(livePatientCount, patients.length);
    }
    
    // Average Age
    if (patients.length > 0) {
        const avgAge = patients.reduce((sum, p) => sum + p.age, 0) / patients.length;
        const avgAgeEl = document.getElementById('avgAge');
        if (avgAgeEl) {
            animateNumber(avgAgeEl, Math.round(avgAge));
        }
    }
    
    // Unique Conditions Count
    const uniqueConditions = [...new Set(patients.map(p => p.condition))].length;
    const conditionCountEl = document.getElementById('conditionCount');
    if (conditionCountEl) {
        animateNumber(conditionCountEl, uniqueConditions);
    }
    
    // Today's Count
    updateTodayCount();
}

// Update Today's Count
function updateTodayCount() {
    const todayCountEl = document.getElementById('todayCount');
    if (todayCountEl) {
        animateNumber(todayCountEl, todayPatients);
    }
}

// Animate Number
function animateNumber(element, target) {
    const start = parseInt(element.textContent) || 0;
    const duration = 1000;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('conditionChart');
    if (!ctx) return;
    
    const conditionData = getConditionData();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(conditionData),
            datasets: [{
                data: Object.values(conditionData),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(72, 187, 120, 0.8)',
                    'rgba(237, 137, 54, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(72, 187, 120, 1)',
                    'rgba(237, 137, 54, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e2e8f0',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 32, 44, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#a0aec0',
                    borderColor: 'rgba(102, 126, 234, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update Chart
function updateChart() {
    if (!chartInstance) return;
    
    const conditionData = getConditionData();
    chartInstance.data.labels = Object.keys(conditionData);
    chartInstance.data.datasets[0].data = Object.values(conditionData);
    chartInstance.update();
}

// Get Condition Data
function getConditionData() {
    const conditionData = {
        'Diabetes': 0,
        'Thyroid': 0,
        'High Blood Pressure': 0
    };
    
    patients.forEach(patient => {
        if (conditionData.hasOwnProperty(patient.condition)) {
            conditionData[patient.condition]++;
        }
    });
    
    return conditionData;
}

// Update Patients Table
function updatePatientsTable() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;
    
    // Sort patients by date (newest first)
    const sortedPatients = [...patients].reverse().slice(0, 10); // Show last 10
    
    tbody.innerHTML = sortedPatients.map(patient => {
        const date = new Date(patient.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        return `
            <tr>
                <td>#${patient.id}</td>
                <td>${patient.name}</td>
                <td>${patient.gender === 'Male' ? '👨' : '👩'} ${patient.gender}</td>
                <td>${patient.age}</td>
                <td><span class="badge badge-primary">${patient.condition}</span></td>
                <td>${formattedDate}</td>
                <td>
                    <button class="action-btn" onclick="viewPatient(${patient.id})">View</button>
                    <button class="action-btn" onclick="deletePatient(${patient.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// View Patient
function viewPatient(id) {
    const patient = patients.find(p => p.id === id);
    if (patient) {
        showToast(`Viewing ${patient.name}'s details`, "info");
        // You can implement a modal or detailed view here
    }
}

// Delete Patient
function deletePatient(id) {
    if (confirm('Are you sure you want to delete this patient record?')) {
        const index = patients.findIndex(p => p.id === id);
        if (index > -1) {
            const patient = patients[index];
            patients.splice(index, 1);
            localStorage.setItem('patients', JSON.stringify(patients));
            
            // Update today's count if patient was added today
            const patientDate = new Date(patient.date).toDateString();
            const today = new Date().toDateString();
            if (patientDate === today && todayPatients > 0) {
                todayPatients--;
                localStorage.setItem('todayPatients', todayPatients.toString());
            }
            
            generateReport();
            updateLiveStats();
            updateChart();
            updatePatientsTable();
            
            showToast(`Patient record deleted`, "success");
            
            // Hide table if no patients
            if (patients.length === 0) {
                const tableSection = document.getElementById('recentPatientsSection');
                if (tableSection) {
                    tableSection.style.display = 'none';
                }
            }
        }
    }
}

// Export Data
function exportData() {
    if (patients.length === 0) {
        showToast("No data to export", "error");
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'Name', 'Gender', 'Age', 'Condition', 'Date'];
    const csvContent = [
        headers.join(','),
        ...patients.map(p => {
            const date = new Date(p.date).toLocaleString();
            return [p.id, p.name, p.gender, p.age, p.condition, date].join(',');
        })
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_census_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Data exported successfully!", "success");
}

// Refresh Stats
function refreshStats() {
    showLoading();
    setTimeout(() => {
        generateReport();
        updateLiveStats();
        updateChart();
        hideLoading();
        showToast("Statistics refreshed!", "success");
    }, 500);
}

// Show Toast Notification
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (!toast || !toastMessage) return;
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    if (toastIcon) {
        toastIcon.textContent = icons[type] || icons.success;
    }
    
    // Set background based on type
    const gradients = {
        success: 'linear-gradient(135deg, #48bb78 0%, #38b2ac 100%)',
        error: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
        info: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
        warning: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)'
    };
    
    toast.style.background = gradients[type] || gradients.success;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show Loading
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

// Hide Loading
function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// Contact Form Handler (for contact page)
if (document.getElementById('contactForm')) {
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('email').value;
        const condition = document.getElementById('contactCondition').value;
        const message = document.getElementById('message').value;
        
        // Show loading
        showLoading();
        
        // Simulate sending message
        setTimeout(() => {
            // Store inquiry (you can send to backend here)
            const inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]');
            inquiries.push({
                id: Date.now(),
                name,
                email,
                condition,
                message,
                date: new Date().toISOString()
            });
            localStorage.setItem('inquiries', JSON.stringify(inquiries));
            
            // Reset form
            this.reset();
            
            // Hide loading and show success
            hideLoading();
            alert('Thank you for contacting us! We will get back to you soon.');
            
            // Optionally redirect to home
            setTimeout(() => {
                window.location.href = './index.html';
            }, 2000);
        }, 1000);
    });
}
