document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const loadBtn = document.getElementById('loadBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const jsonFileInput = document.getElementById('jsonFile');
    const fileNameSpan = document.getElementById('fileName');
    const fileDateSpan = document.getElementById('fileDate');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const exportPdfBtn = document.getElementById('exportPdf');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const compareReportsBtn = document.getElementById('compareReports');
    const programSearchInput = document.getElementById('programSearch');
    
    let currentReport = null;

    // 1. Inicialización del modo oscuro
    function initDarkMode() {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            this.innerHTML = document.body.classList.contains('dark-mode') 
                ? '<i class="fas fa-sun"></i> Modo Claro' 
                : '<i class="fas fa-moon"></i> Modo Oscuro';
            
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });

        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
        }
    }

    // 2. Cargar archivo JSON
    function setupFileLoader() {
        loadBtn.addEventListener('click', function() {
            if (jsonFileInput.files.length > 0) {
                const file = jsonFileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        currentReport = JSON.parse(e.target.result);
                        displayReport(currentReport);
                        fileNameSpan.textContent = file.name;
                        fileDateSpan.textContent = new Date(file.lastModified).toLocaleString();
                        
                        saveToHistory(currentReport, file.name);
                    } catch (error) {
                        showAlert(`Error al parsear el archivo JSON: ${error.message}`, 'error');
                        console.error('Error parsing JSON:', error);
                    }
                };
                
                reader.onerror = function() {
                    showAlert('Error al leer el archivo', 'error');
                };
                
                reader.readAsText(file);
            } else {
                showAlert('Por favor selecciona un archivo JSON primero', 'warning');
            }
        });
    }

    // 3. Actualizar vista
    function setupRefreshButton() {
        refreshBtn.addEventListener('click', function() {
            if (currentReport) {
                displayReport(currentReport);
                showAlert('Reporte actualizado', 'success');
            } else {
                showAlert('No hay reporte cargado para actualizar', 'warning');
            }
        });
    }

    // 4. Sistema de pestañas
    function setupTabs() {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    // 5. Exportar PDF
    function setupPdfExport() {
        exportPdfBtn.addEventListener('click', function() {
            if (!currentReport) {
                showAlert('No hay reporte cargado para exportar', 'warning');
                return;
            }

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(18);
                doc.text('Reporte del Sistema', 14, 15);
                doc.setFontSize(12);
                doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);
                doc.text(`Equipo: ${currentReport.Dominio || 'N/A'}`, 14, 29);
                
                let yPosition = 40;
                const addSection = (title, content) => {
                    doc.setFontSize(14);
                    doc.setTextColor(40, 53, 147);
                    doc.text(title, 14, yPosition);
                    yPosition += 8;
                    
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    content.forEach(line => {
                        if (yPosition > 280) {
                            doc.addPage();
                            yPosition = 20;
                        }
                        doc.text(line, 16, yPosition);
                        yPosition += 7;
                    });
                    yPosition += 5;
                };

                addSection('Información del Sistema', [
                    `Sistema Operativo: ${currentReport['Sistema Operativo'] || 'N/A'}`,
                    `Arquitectura: ${currentReport.Arquitectura || 'N/A'}`,
                    `Usuario: ${currentReport.Usuario || 'N/A'}`
                ]);

                addSection('Hardware', [
                    `Procesador: ${currentReport.Procesador || 'N/A'}`,
                    `RAM: ${currentReport.RAM?.Total || 'N/A'} (${currentReport.RAM?.Uso || 'N/A'} usado)`
                ]);

                doc.save('reporte-sistema.pdf');
                showAlert('PDF exportado correctamente', 'success');
            } catch (error) {
                showAlert('Error al generar PDF: ' + error.message, 'error');
                console.error('PDF generation error:', error);
            }
        });
    }

    // 6. Buscar programas
    function setupProgramSearch() {
        programSearchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const programs = document.querySelectorAll('.program-list li');
            
            programs.forEach(program => {
                program.style.display = program.textContent.toLowerCase().includes(searchTerm) 
                    ? 'block' 
                    : 'none';
            });
        });
    }

    // 7. Comparar reportes
    function setupReportComparison() {
        compareReportsBtn.addEventListener('click', function() {
            const modal = document.getElementById('compareModal');
            modal.style.display = 'block';
        });

        document.querySelector('.close').addEventListener('click', function() {
            document.getElementById('compareModal').style.display = 'none';
        });

        window.addEventListener('click', function(event) {
            const modal = document.getElementById('compareModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 8. Mostrar reporte completo
    function displayReport(report) {
        if (!report) {
            showAlert('No hay datos de reporte para mostrar', 'warning');
            return;
        }
        
        try {
            // Actualizar vista general
            document.getElementById('processorInfo').textContent = report.Procesador || '-';
            document.getElementById('ramInfo').textContent = report.RAM ? `${report.RAM.Total} (${report.RAM.Uso} usado)` : '-';
            
            // Información de almacenamiento
            if (Array.isArray(report.Discos)) {
                const totalSize = report.Discos.reduce((sum, disk) => {
                    const size = parseFloat(disk.Tamaño) || 0;
                    return sum + size;
                }, 0);
                document.getElementById('storageInfo').textContent = `${totalSize.toFixed(1)} GB total`;
            } else {
                document.getElementById('storageInfo').textContent = '-';
            }
            
            document.getElementById('uptimeInfo').textContent = report['Tiempo Encendido'] || '-';
            
            // Llenar pestañas
            fillHardwareTab(report);
            fillSoftwareTab(report);
            fillNetworkTab(report);
            fillSecurityTab(report);
            
            // Crear gráficos
            createCharts(report);
            
            // Verificar alertas
            checkForAlerts(report);
            
            // Aplicar animaciones
            applyAnimations();
        } catch (error) {
            showAlert(`Error al mostrar el reporte: ${error.message}`, 'error');
            console.error('Display report error:', error);
        }
    }

    // 9. Llenado de pestaña de hardware
    function fillHardwareTab(report) {
        const tab = document.getElementById('hardware-tab');
        if (!tab) return;
        
        try {
            let html = `
                <div class="data-card">
                    <h3><i class="fas fa-info-circle"></i> Información del Sistema</h3>
                    <table class="data-table">
                        <tr>
                            <th>Sistema Operativo</th>
                            <td>${report['Sistema Operativo'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Edición Windows</th>
                            <td>${report['Edición Windows'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Arquitectura</th>
                            <td>${report.Arquitectura || '-'}</td>
                        </tr>
                        <tr>
                            <th>Usuario</th>
                            <td>${report.Usuario || '-'}</td>
                        </tr>
                        <tr>
                            <th>Dominio</th>
                            <td>${report.Dominio || '-'}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="data-card">
                    <h3><i class="fas fa-microchip"></i> Procesador</h3>
                    <table class="data-table">
                        <tr>
                            <th>Modelo</th>
                            <td>${report.Procesador || '-'}</td>
                        </tr>
                        <tr>
                            <th>Núcleos Físicos</th>
                            <td>${report['Núcleos Físicos'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Núcleos Lógicos</th>
                            <td>${report['Núcleos Lógicos'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Uso CPU</th>
                            <td>${report['Uso CPU'] || '-'}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="data-card">
                    <h3><i class="fas fa-memory"></i> Memoria RAM</h3>
                    <table class="data-table">
                        <tr>
                            <th>Total</th>
                            <td>${report.RAM?.Total || '-'}</td>
                        </tr>
                        <tr>
                            <th>Disponible</th>
                            <td>${report.RAM?.Disponible || '-'}</td>
                        </tr>
                        <tr>
                            <th>Uso</th>
                            <td>${report.RAM?.Uso || '-'}</td>
                        </tr>
                    </table>
                </div>
            `;
            
            // Discos duros
            if (Array.isArray(report.Discos)) {
                html += `
                    <div class="data-card">
                        <h3><i class="fas fa-hdd"></i> Discos</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Modelo</th>
                                    <th>Tamaño</th>
                                    <th>Tipo</th>
                                    <th>Unidades</th>
                                    <th>Serial</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.Discos.map(disk => `
                                    <tr>
                                        <td>${disk.Modelo || '-'}</td>
                                        <td>${disk.Tamaño || '-'}</td>
                                        <td>${disk.Tipo || '-'}</td>
                                        <td>${Array.isArray(disk.Unidades) ? disk.Unidades.join(', ') : disk.Unidades || '-'}</td>
                                        <td>${disk.Serial || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            // BIOS
            if (report.BIOS && typeof report.BIOS === 'object') {
                html += `
                    <div class="data-card">
                        <h3><i class="fas fa-microchip"></i> BIOS</h3>
                        <table class="data-table">
                            <tr>
                                <th>Fabricante</th>
                                <td>${report.BIOS.Fabricante || '-'}</td>
                            </tr>
                            <tr>
                                <th>Versión</th>
                                <td>${report.BIOS.Versión || '-'}</td>
                            </tr>
                            <tr>
                                <th>Serial</th>
                                <td>${report.BIOS.Serial || '-'}</td>
                            </tr>
                            <tr>
                                <th>Fecha</th>
                                <td>${report.BIOS.Fecha || '-'}</td>
                            </tr>
                        </table>
                    </div>
                `;
            }
            
            tab.innerHTML = html;
        } catch (error) {
            console.error('Error filling hardware tab:', error);
            tab.innerHTML = '<p>Error al cargar la información de hardware</p>';
        }
    }

    // 10. Llenado de pestaña de software
    function fillSoftwareTab(report) {
        const tab = document.getElementById('software-tab');
        if (!tab) return;
        
        try {
            let html = `
                <div class="search-box">
                    <input type="text" id="programSearch" placeholder="Buscar programas...">
                </div>
                <div class="data-card">
                    <h3><i class="fas fa-info-circle"></i> Información General</h3>
                    <table class="data-table">
                        <tr>
                            <th>Hora del Sistema</th>
                            <td>${report['Hora Sistema'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Tiempo Encendido</th>
                            <td>${report['Tiempo Encendido'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Procesos Activos</th>
                            <td>${report['Procesos Activos'] || '-'}</td>
                        </tr>
                        <tr>
                            <th>Token PC</th>
                            <td>${report['Token PC'] || '-'}</td>
                        </tr>
                    </table>
                </div>
            `;
            
            // Programas instalados
            if (Array.isArray(report['Programas Instalados'])) {
                html += `
                    <div class="data-card">
                        <h3><i class="fas fa-box"></i> Programas Instalados (${report['Programas Instalados'].length})</h3>
                        <div class="program-list">
                            <ul>
                                ${report['Programas Instalados'].map(program => `
                                    <li>${program}</li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            } else if (typeof report['Programas Instalados'] === 'string') {
                html += `
                    <div class="data-card">
                        <h3><i class="fas fa-box"></i> Programas Instalados</h3>
                        <p>${report['Programas Instalados']}</p>
                    </div>
                `;
            }
            
            tab.innerHTML = html;
            
            // Configurar buscador después de cargar los programas
            const searchInput = tab.querySelector('#programSearch');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase();
                    const programs = tab.querySelectorAll('.program-list li');
                    
                    programs.forEach(program => {
                        program.style.display = program.textContent.toLowerCase().includes(searchTerm) 
                            ? 'block' 
                            : 'none';
                    });
                });
            }
        } catch (error) {
            console.error('Error filling software tab:', error);
            tab.innerHTML = '<p>Error al cargar la información de software</p>';
        }
    }

    // 11. Llenado de pestaña de red
    function fillNetworkTab(report) {
        const tab = document.getElementById('network-tab');
        if (!tab) return;
        
        try {
            if (!report.Red || typeof report.Red !== 'object') {
                tab.innerHTML = '<p>No hay información de red disponible</p>';
                return;
            }
            
            let html = `
                <div class="data-card">
                    <h3><i class="fas fa-network-wired"></i> Información de Red</h3>
                    <table class="data-table">
                        <tr>
                            <th>Dirección MAC</th>
                            <td>${report.Red.MAC || '-'}</td>
                        </tr>
                        <tr>
                            <th>Dirección IP</th>
                            <td>${report.Red.IPv4 || '-'}</td>
                        </tr>
                        <tr>
                            <th>Hostname</th>
                            <td>${report.Red.Hostname || '-'}</td>
                        </tr>
                        <tr>
                            <th>DNS</th>
                            <td>${report.Red.DNS || '-'}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="data-card">
                    <h3><i class="fas fa-tachometer-alt"></i> Ancho de Banda</h3>
                    <table class="data-table">
                        <tr>
                            <th>Datos Enviados</th>
                            <td>${report.Red['Ancho Banda']?.Enviados || '-'}</td>
                        </tr>
                        <tr>
                            <th>Datos Recibidos</th>
                            <td>${report.Red['Ancho Banda']?.Recibidos || '-'}</td>
                        </tr>
                    </table>
                </div>
            `;
            
            // Conexiones de red
            if (Array.isArray(report.Red.Conexiones) && report.Red.Conexiones.length > 0) {
                html += `
                    <div class="data-card">
                        <h3><i class="fas fa-plug"></i> Conexiones Activas (${report.Red.Conexiones.length})</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Estado</th>
                                    <th>IP Local</th>
                                    <th>Puerto Local</th>
                                    <th>IP Remota</th>
                                    <th>Puerto Remoto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.Red.Conexiones.map(conn => `
                                    <tr>
                                        <td>${conn.Estado || '-'}</td>
                                        <td>${conn['IP Local'] || '-'}</td>
                                        <td>${conn['Puerto Local'] || '-'}</td>
                                        <td>${conn['IP Remota'] || '-'}</td>
                                        <td>${conn['Puerto Remoto'] || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            tab.innerHTML = html;
        } catch (error) {
            console.error('Error filling network tab:', error);
            tab.innerHTML = '<p>Error al cargar la información de red</p>';
        }
    }

    // 12. Llenado de pestaña de seguridad
    function fillSecurityTab(report) {
        const tab = document.getElementById('security-tab');
        if (!tab) return;
        
        try {
            let html = `
                <div class="data-card">
                    <h3><i class="fas fa-shield-alt"></i> Estado del Firewall</h3>
                    <p>${report.Firewall || 'No disponible'}</p>
                </div>
            `;
            
            // Actualizaciones pendientes
            if (Array.isArray(report['Actualizaciones Pendientes'])) {
                html += `
                    <div class="data-card">
                        <h3><i class="fas fa-cloud-download-alt"></i> Actualizaciones Pendientes (${report['Actualizaciones Pendientes'].length})</h3>
                        <ul>
                            ${report['Actualizaciones Pendientes'].map(update => `
                                <li>${update}</li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
            
            tab.innerHTML = html;
        } catch (error) {
            console.error('Error filling security tab:', error);
            tab.innerHTML = '<p>Error al cargar la información de seguridad</p>';
        }
    }

    // 13. Creación de gráficos
    function createCharts(report) {
        try {
            // Eliminar gráficos existentes
            const oldCharts = document.querySelectorAll('.chart-container');
            oldCharts.forEach(chart => chart.remove());
            
            // Gráfico de recursos
            const resourceCtx = document.createElement('canvas');
            resourceCtx.id = 'resourceChart';
            const resourceCard = createCardWithChart(resourceCtx, '<i class="fas fa-chart-pie"></i> Uso de Recursos');
            document.querySelector('#hardware-tab').appendChild(resourceCard);

            new Chart(resourceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['CPU', 'RAM', 'Almacenamiento'],
                    datasets: [{
                        data: [
                            parseFloat(report['Uso CPU']?.replace('%', '')) || 0,
                            parseFloat(report.RAM?.Uso?.replace('%', '')) || 0,
                            calculateStorageUsage(report.Discos)
                        ],
                        backgroundColor: [
                            '#3498db',
                            '#2ecc71',
                            '#e74c3c'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating charts:', error);
        }
    }

    // 14. Funciones auxiliares
    function createCardWithChart(element, title) {
        const card = document.createElement('div');
        card.className = 'data-card';
        card.innerHTML = `<h3>${title}</h3><div class="chart-container"></div>`;
        card.querySelector('.chart-container').appendChild(element);
        return card;
    }

    function calculateStorageUsage(disks) {
        if (!Array.isArray(disks)) return 0;
        // Lógica simplificada para el ejemplo
        return disks.length > 0 ? 30 : 0;
    }

    function checkForAlerts(report) {
        try {
            // Alerta de RAM
            if (parseFloat(report.RAM?.Uso?.replace('%', '')) > 80) {
                showAlert('¡Uso de RAM crítico!', 'warning');
            }
            
            // // Alerta de firewall
            // if (report.Firewall === 'Desactivado') {
            //     showAlert('Firewall desactivado - riesgo de seguridad', 'warning');
            // }
            
            // Alerta de tiempo de actividad
            const uptime = report['Tiempo Encendido'];
            if (uptime && uptime.includes('day') && parseInt(uptime) > 7) {
                showAlert('El equipo lleva más de 7 días sin reiniciarse', 'info');
            }
        } catch (error) {
            console.error('Error checking alerts:', error);
        }
    }

    function showAlert(message, type) {
        try {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.innerHTML = `
                <span>${message}</span>
                <button class="close-btn">&times;</button>
            `;
            document.body.prepend(alert);
            
            alert.querySelector('.close-btn').addEventListener('click', () => {
                alert.remove();
            });
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error showing alert:', error);
            alert(message); // Fallback básico
        }
    }

    function saveToHistory(report, filename) {
        try {
            const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
            history.unshift({
                date: new Date().toISOString(),
                name: filename,
                data: report
            });
            
            if (history.length > 5) history.pop();
            
            localStorage.setItem('reportHistory', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    function applyAnimations() {
        try {
            document.querySelectorAll('.data-card').forEach((card, index) => {
                card.classList.add('animate__animated', 'animate__fadeInUp');
                card.style.animationDelay = `${index * 0.1}s`;
            });
        } catch (error) {
            console.error('Error applying animations:', error);
        }
    }

    // Inicialización de todas las funciones
    function init() {
        initDarkMode();
        setupFileLoader();
        setupRefreshButton();
        setupTabs();
        setupPdfExport();
        setupProgramSearch();
        setupReportComparison();
    }

    // Iniciar la aplicación
    init();
});