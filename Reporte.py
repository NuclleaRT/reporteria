# -*- coding: utf-8 -*-
import os
import psutil
import platform
import socket
import subprocess
import random
import string
import re
import json
import uuid
from datetime import datetime
import winreg
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText
import argparse

# Configuración de rutas
REPORT_PATH = r"D:\reporteria\informes"
os.makedirs(REPORT_PATH, exist_ok=True)

# Configuración de email (MODIFICA CON TUS DATOS)
EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "port": 587,
    "sender": "tu_email@gmail.com",
    "password": "tu_contraseña_app",  # Usar contraseña de aplicación
    "receiver": "destinatario@empresa.com"
}

def generar_token():
    """Genera un token único de 15 caracteres"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=15))

def obtener_generacion_procesador():
    """Detecta modelo y generación del procesador"""
    try:
        cpu_info = platform.processor()
        if re.search(r'intel', cpu_info, re.IGNORECASE):
            match = re.search(r'i(\d)-?(\d{3,4})\w*', cpu_info)
            if match:
                gen = match.group(2)[:2] if int(match.group(2)[:2]) > 5 else match.group(1)
                return f"Intel Core i{match.group(1)}-{match.group(2)} (Gen {gen})"
        return cpu_info
    except Exception as e:
        return f"Error: {str(e)}"

def obtener_discos():
    """Obtiene información detallada de discos"""
    try:
        import wmi
        discos = []
        w = wmi.WMI()
        
        # Mapeo de particiones a letras de unidad
        particiones = {p.DiskIndex: p for p in w.Win32_DiskPartition()}
        unidades = {u.DeviceID: u for u in w.Win32_LogicalDisk()}
        
        for disk in w.Win32_DiskDrive():
            try:
                # Obtener letras de unidad asociadas
                disk_parts = [p for p in particiones.values() if p.DiskIndex == disk.Index]
                letras = []
                for part in disk_parts:
                    for logical in unidades.values():
                        if part.Name in logical.ProviderName:
                            letras.append(logical.DeviceID)
                
                # Determinar tipo de disco
                tipo = "HDD"
                model_upper = disk.Model.upper()
                if "SSD" in model_upper:
                    tipo = "SSD"
                elif "NVME" in model_upper or "M.2" in model_upper:
                    tipo = "NVMe"
                
                discos.append({
                    "Modelo": disk.Model.strip(),
                    "Tamaño": f"{int(disk.Size)//(1024**3)} GB",
                    "Tipo": tipo,
                    "Unidades": letras,
                    "Serial": disk.SerialNumber.strip() if disk.SerialNumber else "N/A"
                })
            except Exception as e:
                continue
        
        return discos if discos else "No detectado"
    except Exception as e:
        # Fallback con psutil
        try:
            return [{
                "Unidad": part.device,
                "Tamaño": f"{psutil.disk_usage(part.mountpoint).total//(1024**3)} GB",
                "Tipo": "SSD" if "ssd" in part.opts.lower() else "HDD",
                "Sistema Archivos": part.fstype
            } for part in psutil.disk_partitions() if part.mountpoint]
        except Exception as e:
            return f"Error: {str(e)}"

def obtener_programas_instalados():
    """Lista programas instalados desde el registro"""
    try:
        programas = set()
        claves_registro = [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        ]
        
        for clave in claves_registro:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, clave) as key:
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                if name: programas.add(name.strip())
                        except:
                            continue
            except:
                continue
        
        return sorted(list(programas)) if programas else "No detectado"
    except Exception as e:
        return f"Error: {str(e)}"

def obtener_info_red():
    """Recopila información de red"""
    try:
        info = {}
        interfaces = psutil.net_if_addrs()
        stats = psutil.net_io_counters()
        
        # Información básica de red
        info['MAC'] = ':'.join(re.findall('..', '%012x' % uuid.getnode()))
        info['IPv4'] = socket.gethostbyname(socket.gethostname())
        info['Hostname'] = socket.gethostname()
        info['DNS'] = socket.getfqdn()
        info['Ancho Banda'] = {
            "Enviados": f"{stats.bytes_sent//(1024**2)} MB",
            "Recibidos": f"{stats.bytes_recv//(1024**2)} MB"
        }
        
        # Conexiones activas
        info['Conexiones'] = [{
            "Estado": conn.status,
            "IP Local": conn.laddr.ip,
            "Puerto Local": conn.laddr.port,
            "IP Remota": conn.raddr.ip if conn.raddr else "N/A",
            "Puerto Remoto": conn.raddr.port if conn.raddr else "N/A",
            "PID": conn.pid
        } for conn in psutil.net_connections(kind='inet') if conn.status == 'ESTABLISHED']
        
        return info
    except Exception as e:
        return f"Error: {str(e)}"

def obtener_info_sistema():
    """Función principal que recopila todos los datos"""
    info = {}
    
    try:
        # Información básica del sistema
        info['Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        info['Sistema Operativo'] = f"{platform.system()} {platform.release()}"
        info['Edición Windows'] = platform.version()
        info['Arquitectura'] = platform.architecture()[0]
        info['Usuario'] = os.getlogin()
        info['Dominio'] = platform.node()
        
        # Información del hardware
        info['Procesador'] = obtener_generacion_procesador()
        info['Núcleos Físicos'] = psutil.cpu_count(logical=False)
        info['Núcleos Lógicos'] = psutil.cpu_count(logical=True)
        
        # Uso de CPU
        info['Uso CPU'] = f"{psutil.cpu_percent(interval=1)}%"
        
        # Memoria
        mem = psutil.virtual_memory()
        info['RAM'] = {
            "Total": f"{mem.total//(1024**3)} GB",
            "Disponible": f"{mem.available//(1024**3)} GB",
            "Uso": f"{mem.percent}%",
            "Usada": f"{mem.used//(1024**3)} GB"
        }
        
        # Discos
        info['Discos'] = obtener_discos()
        
        # BIOS
        try:
            import wmi
            w = wmi.WMI()
            bios = w.Win32_BIOS()[0]
            info['BIOS'] = {
                "Fabricante": bios.Manufacturer,
                "Versión": bios.Version,
                "Serial": bios.SerialNumber,
                "Fecha": bios.ReleaseDate.split('.')[0] if bios.ReleaseDate else "N/A"
            }
        except Exception as e:
            info['BIOS'] = f"Error: {str(e)}"
        
        # Red
        info['Red'] = obtener_info_red()
        
        # Tiempo de actividad
        info['Tiempo Encendido'] = str(datetime.now() - datetime.fromtimestamp(psutil.boot_time()))
        
        # Software
        info['Programas Instalados'] = obtener_programas_instalados()
        info['Procesos Activos'] = len(psutil.pids())
        
        # Seguridad
        try:
            firewall_status = subprocess.check_output(
                'netsh advfirewall show allprofiles state', 
                shell=True, 
                stderr=subprocess.DEVNULL
            ).decode()
            info['Firewall'] = "Activado" if "ON" in firewall_status else "Desactivado"
        except:
            info['Firewall'] = "No disponible"
        
        # Token único
        info['Token PC'] = generar_token()
        
    except Exception as e:
        info['Error General'] = f"Fallo crítico: {str(e)}"
    
    return info

def guardar_info_json(info):
    """Guarda el informe en formato JSON"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(REPORT_PATH, f"informe_{timestamp}.json")
    
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(info, f, indent=4, ensure_ascii=False, default=str)
        return filename
    except Exception as e:
        print(f"✖ Error guardando JSON: {str(e)}")
        return None

def enviar_correo(archivo_adjunto):
    """Envía el informe por correo electrónico"""
    try:
        # Configuración del mensaje
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG['sender']
        msg['To'] = EMAIL_CONFIG['receiver']
        msg['Subject'] = f"Informe del Sistema - {datetime.now().strftime('%d/%m/%Y')}"
        
        # Cuerpo del mensaje
        body = f"""
        <h2>Informe del Sistema</h2>
        <p>Se adjunta el informe generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M:%S')}</p>
        <p><strong>Equipo:</strong> {socket.gethostname()}</p>
        <p><strong>Usuario:</strong> {os.getlogin()}</p>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Adjuntar archivo
        with open(archivo_adjunto, "rb") as f:
            adjunto = MIMEApplication(f.read(), _subtype="json")
            adjunto.add_header(
                'Content-Disposition', 
                'attachment', 
                filename=os.path.basename(archivo_adjunto)
            )
            msg.attach(adjunto)
        
        # Envío del correo
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['sender'], EMAIL_CONFIG['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"✖ Error enviando correo: {str(e)}")
        return False

if __name__ == "__main__":
    # Configuración de argumentos
    parser = argparse.ArgumentParser(
        description='Genera un informe detallado del sistema',
        epilog='Ejemplo: python Reporte.py --email'
    )
    parser.add_argument(
        '--email', 
        action='store_true',
        help='Envía el informe por correo electrónico'
    )
    args = parser.parse_args()
    
    print("🔍 Iniciando recopilación de información del sistema...")
    
    # Obtener información
    informe = obtener_info_sistema()
    
    # Guardar en JSON
    archivo_json = guardar_info_json(informe)
    if archivo_json:
        print(f"💾 Informe guardado en: {archivo_json}")
    else:
        print("✖ Error al guardar el informe")
        exit(1)
    
    # Enviar por correo si se especificó
    if args.email:
        print("📤 Enviando informe por correo electrónico...")
        if enviar_correo(archivo_json):
            print("✔ Correo enviado correctamente")
        else:
            print("✖ Error al enviar el correo")
    
    print("✅ Proceso completado")