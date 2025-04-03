document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const loadBtn = document.getElementById('loadBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const jsonFileInput = document.getElementById('jsonFile');
    const fileNameSpan = document.getElementById('fileName');
    const fileDateSpan = document.getElementById('fileDate');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    let currentReport = null;

    // Cargar archivo JSON
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
                } catch (error) {
                    alert('Error al parsear el archivo JSON: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        } else {
            alert('Por favor selecciona un archivo JSON primero');
        }
    });

    // Actualizar vista
    refreshBtn.addEventListener('click', function() {
        if (currentReport) {
            displayReport(currentReport);
        } else {
            alert('No hay reporte cargado para actualizar');
        }
    });

    // Sistema de pestañas
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Actualizar botones
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Actualizar contenidos
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Función para mostrar el reporte
    function displayReport(report) {
        if (!report) return;
        
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
        
        // Llenar pestaña de Hardware
        fillHardwareTab(report);
        
        // Llenar pestaña de Software
        fillSoftwareTab(report);
        
        // Llenar pestaña de Red
        fillNetworkTab(report);
        
        // Llenar pestaña de Seguridad
        fillSecurityTab(report);
    }

    function fillHardwareTab(report) {
        const tab = document.getElementById('hardware-tab');
        tab.innerHTML = '';
        
        // Información del sistema
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
    }

    function fillSoftwareTab(report) {
        const tab = document.getElementById('software-tab');
        tab.innerHTML = '';
        
        let html = `
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
    }

    function fillNetworkTab(report) {
        const tab = document.getElementById('network-tab');
        tab.innerHTML = '';
        
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
    }

    function fillSecurityTab(report) {
        const tab = document.getElementById('security-tab');
        tab.innerHTML = '';
        
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
    }
});