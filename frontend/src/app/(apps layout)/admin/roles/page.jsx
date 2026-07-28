'use client'
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import * as Icons from 'tabler-icons-react';

const getApiBase = () => {
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
        return `${protocol}//${hostname}:8081`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081';
};

const API_BASE = getApiBase();

// List of all system modules
const SYSTEM_MODULES = [
    { id: 'dashboard', name: 'Dashboard', icon: 'Template', desc: 'Panel de control principal y estadísticas claves.', color: '#0d6efd' },
    { id: 'chat', name: 'Chat WhatsApp', icon: 'MessageDots', desc: 'Chat multiagente, plantillas y envío masivo.', color: '#25d366' },
    { id: 'contactos', name: 'Contactos', icon: 'Notebook', desc: 'Gestión de clientes, personas y empresas.', color: '#6f42c1' },
    { id: 'oportunidades', name: 'Oportunidades', icon: 'UserSearch', desc: 'Control del embudo comercial y prospectos.', color: '#fd7e14' },
    { id: 'pedidos', name: 'Pedidos', icon: 'FileCheck', desc: 'Registro de órdenes, reparto y zonas.', color: '#0dcaf0' },
    { id: 'ventas', name: 'Ventas', icon: 'FileDigit', desc: 'Gestión de comprobantes y reportes de facturación.', color: '#198754' },
    { id: 'productos', name: 'Productos', icon: 'Layout', desc: 'Catálogo de artículos y categorización.', color: '#d63384' },
    { id: 'inventarios', name: 'Inventarios', icon: 'LayoutKanban', desc: 'Control de stock y compras de almacén.', color: '#ffc107' },
    { id: 'finanzas', name: 'Finanzas', icon: 'Inbox', desc: 'Movimientos de caja, gastos y deudas.', color: '#20c997' },
    { id: 'personal', name: 'Personal y Planilla', icon: 'UserPlus', desc: 'Asistencia de trabajadores y nóminas.', color: '#dc3545' },
    { id: 'admin', name: 'Administración', icon: 'FileCode2', desc: 'Acceso a ajustes y gestión de usuarios.', color: '#343a40' }
];

// Default Role Templates
const DEFAULT_TEMPLATES = {
    'ADMIN': ['dashboard', 'chat', 'contactos', 'oportunidades', 'pedidos', 'ventas', 'productos', 'inventarios', 'finanzas', 'personal', 'admin'],
    'VENDEDOR': ['dashboard', 'chat', 'contactos', 'oportunidades', 'pedidos', 'productos'],
    'OPERADOR': ['chat', 'contactos', 'pedidos', 'productos'],
    'CONTADOR': ['dashboard', 'ventas', 'productos', 'inventarios', 'finanzas'],
    'PERSONAL': ['personal']
};

export default function RolesPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });
    
    // Selection state for user editing
    const [selectedUser, setSelectedUser] = useState(null);
    const [userRole, setUserRole] = useState('USER');
    const [selectedModules, setSelectedModules] = useState([]);
    
    // Custom templates stored in localStorage (merged with default ones)
    const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/admin/users`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                // Select first user by default if available
                if (data.length > 0 && !selectedUser) {
                    selectUserForEditing(data[0]);
                }
            } else {
                showAlert('danger', 'Error al cargar los usuarios.');
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            showAlert('danger', 'Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // Load custom templates if they exist in localStorage
        const stored = localStorage.getItem('role_templates');
        if (stored) {
            try {
                setTemplates(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing templates:", e);
            }
        }
    }, []);

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => {
            setAlert(prev => ({ ...prev, show: false }));
        }, 5000);
    };

    const selectUserForEditing = (user) => {
        setSelectedUser(user);
        setUserRole(user.role);
        
        // Parse modules (comma-separated string)
        if (user.modules) {
            const mods = user.modules.split(',').map(m => m.trim()).filter(m => m.length > 0);
            setSelectedModules(mods);
        } else {
            // Fallback to role-based template if user has no specific modules configured
            const roleMods = templates[user.role] || templates['USER'] || [];
            setSelectedModules(roleMods);
        }
    };

    const handleModuleToggle = (moduleId) => {
        setSelectedModules(prev => {
            if (prev.includes(moduleId)) {
                return prev.filter(id => id !== moduleId);
            } else {
                return [...prev, moduleId];
            }
        });
    };

    const handleApplyTemplate = (roleKey) => {
        const templateMods = templates[roleKey] || [];
        setSelectedModules(templateMods);
        setUserRole(roleKey);
    };

    const savePermissions = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const modulesString = selectedModules.join(',');
            
            // Fetch the existing user details from local state to avoid wiping other fields
            const fullUserObj = users.find(u => u.username === selectedUser.username);
            
            const payload = {
                ...fullUserObj,
                role: userRole,
                modules: modulesString
            };

            const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert('success', `Permisos actualizados para el usuario "${selectedUser.username}".`);
                
                // If the updated user is the current active session user, update their local modules
                const currentSessionUser = localStorage.getItem('username');
                if (selectedUser.username === currentSessionUser) {
                    localStorage.setItem('modules', modulesString);
                    localStorage.setItem('role', userRole);
                    // Emit a custom storage event to alert sidebar/header components
                    window.dispatchEvent(new Event('storage'));
                }
                
                // Refresh list
                fetchUsers();
            } else {
                const text = await res.text();
                showAlert('danger', text || 'Error al guardar los cambios.');
            }
        } catch (err) {
            console.error('Error saving permissions:', err);
            showAlert('danger', 'Error de red al intentar guardar los cambios.');
        } finally {
            setSaving(false);
        }
    };

    // Helper to dynamically render a Tabler Icon
    const renderIcon = (iconName, size = 20, color = 'currentColor') => {
        const IconComponent = Icons[iconName];
        if (IconComponent) {
            return <IconComponent size={size} color={color} />;
        }
        return <Icons.Help size={size} color={color} />;
    };

    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Compute stats
    const totalUsersCount = users.length;
    const modulesStats = SYSTEM_MODULES.reduce((acc, m) => {
        const count = users.filter(u => {
            const mods = u.modules ? u.modules.split(',') : [];
            return mods.includes(m.id);
        }).length;
        acc[m.id] = count;
        return acc;
    }, {});

    return (
        <Container fluid className="pt-4">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h1 className="pg-title font-weight-bold" style={{ letterSpacing: '-0.02em' }}>🔑 Roles y Permisos</h1>
                            <p className="text-muted">Asigna módulos del sistema detalladamente a cada usuario o aplica plantillas de roles.</p>
                        </div>
                        <Button variant="outline-primary" onClick={fetchUsers} className="d-flex align-items-center gap-1">
                            <Icons.Refresh size={18} /> Actualizar
                        </Button>
                    </div>
                </Col>
            </Row>

            {alert.show && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant={alert.type} onClose={() => setAlert({ ...alert, show: false })} dismissible>
                            {alert.message}
                        </Alert>
                    </Col>
                </Row>
            )}

            <Row className="mb-4">
                {/* Stats Cards */}
                <Col md={4} className="mb-3">
                    <Card className="border-0 shadow-sm h-100 bg-gradient" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #1f2937, #111827)', color: '#fff' }}>
                        <Card.Body className="d-flex flex-column justify-content-between p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div>
                                    <h6 className="text-uppercase text-muted-light small fw-bold">Usuarios en NextLead</h6>
                                    <h2 className="mb-0 fw-bold">{totalUsersCount}</h2>
                                </div>
                                <div className="p-3 bg-white-translucent rounded-circle">
                                    <Icons.Users size={28} className="text-white" />
                                </div>
                            </div>
                            <div className="border-top border-secondary pt-3 mt-2">
                                <span className="small text-muted-light">Configura el acceso granular de tu personal para resguardar la seguridad de la información.</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={8} className="mb-3">
                    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-transparent border-0 pt-4 pb-0">
                            <h6 className="fw-bold mb-0">📊 Cobertura de Módulos (Usuarios Activos)</h6>
                        </Card.Header>
                        <Card.Body className="py-3">
                            <Row className="row-cols-2 row-cols-md-4 g-2">
                                {SYSTEM_MODULES.slice(0, 8).map(m => {
                                    const percent = totalUsersCount > 0 ? Math.round((modulesStats[m.id] || 0) / totalUsersCount * 100) : 0;
                                    return (
                                        <Col key={m.id}>
                                            <div className="p-2 border rounded d-flex align-items-center gap-2">
                                                <div className="p-2 rounded-circle" style={{ backgroundColor: `${m.color}15` }}>
                                                    {renderIcon(m.icon, 16, m.color)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="small fw-semibold text-truncate">{m.name}</div>
                                                    <div className="text-muted small d-flex align-items-center gap-1">
                                                        <span>{modulesStats[m.id] || 0} u.</span>
                                                        <span className="text-xs">({percent}%)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="detailed" className="mb-4 custom-tabs-nav border-bottom">
                {/* TAB 1: DETAILED ROLE ASSIGNMENT */}
                <Tab eventKey="detailed" title={<span><Icons.UserCheck size={16} className="me-1" /> Asignación por Usuario</span>}>
                    <Row>
                        {/* Users sidebar list */}
                        <Col lg={4} className="mb-4">
                            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                                <Card.Header className="bg-light border-0 py-3">
                                    <div className="position-relative">
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar usuario..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            size="sm"
                                            className="pe-4"
                                            style={{ borderRadius: '8px' }}
                                        />
                                        <Icons.Search size={16} className="text-muted position-absolute" style={{ right: '10px', top: '9px' }} />
                                    </div>
                                </Card.Header>
                                <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                                    <Table hover responsive className="mb-0 align-middle">
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td className="text-center py-4">
                                                        <Spinner animation="border" variant="primary" size="sm" />
                                                        <div className="text-muted small mt-2">Cargando usuarios...</div>
                                                    </td>
                                                </tr>
                                            ) : filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td className="text-center py-4 text-muted small">No se encontraron usuarios.</td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map(user => {
                                                    const isSelected = selectedUser && selectedUser.username === user.username;
                                                    const modulesCount = user.modules ? user.modules.split(',').filter(m => m.length > 0).length : 0;
                                                    return (
                                                        <tr 
                                                            key={user.id} 
                                                            onClick={() => selectUserForEditing(user)}
                                                            className="cursor-pointer"
                                                            style={{ 
                                                                backgroundColor: isSelected ? '#f0f4ff' : 'transparent',
                                                                borderLeft: isSelected ? '4px solid #0d6efd' : '4px solid transparent'
                                                            }}
                                                        >
                                                            <td className="py-3 px-3">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <img 
                                                                        src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`} 
                                                                        alt="avatar" 
                                                                        className="rounded-circle bg-light"
                                                                        style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                                                                    />
                                                                    <div className="overflow-hidden">
                                                                        <div className="fw-semibold text-truncate">{user.username}</div>
                                                                        <div className="text-muted small text-truncate">
                                                                            {user.firstName || ''} {user.lastName || ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-end py-3 px-3">
                                                                <Badge bg={user.role === 'ADMIN' ? 'danger' : 'info'} className="d-block mb-1">
                                                                    {user.role}
                                                                </Badge>
                                                                <span className="text-muted text-xs" style={{ fontSize: '11px' }}>
                                                                    {modulesCount} módulos
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card>
                        </Col>

                        {/* Modules Configurator */}
                        <Col lg={8} className="mb-4">
                            {selectedUser ? (
                                <Card className="border-0 shadow-sm border-top border-primary border-4" style={{ borderRadius: '12px' }}>
                                    <Card.Body className="p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom">
                                            <div className="d-flex align-items-center gap-3">
                                                <img 
                                                    src={selectedUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedUser.username}`} 
                                                    alt="avatar" 
                                                    className="rounded-circle bg-light p-1 border"
                                                    style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                                                />
                                                <div>
                                                    <h5 className="fw-bold mb-1">Personalizar Módulos: @{selectedUser.username}</h5>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-muted small">{selectedUser.firstName} {selectedUser.lastName}</span>
                                                        <span className="text-muted">•</span>
                                                        <span className="text-muted small">Rol: <strong>{userRole}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="success" 
                                                onClick={savePermissions} 
                                                disabled={saving}
                                                className="d-flex align-items-center gap-2 px-3 fw-semibold"
                                                style={{ borderRadius: '8px' }}
                                            >
                                                {saving ? <Spinner animation="border" size="sm" /> : <Icons.DeviceFloppy size={18} />}
                                                Guardar Permisos
                                            </Button>
                                        </div>

                                        {/* Apply Template Quickly */}
                                        <div className="mb-4 p-3 bg-light rounded" style={{ borderRadius: '8px' }}>
                                            <span className="fw-semibold text-dark small d-block mb-2">⚡ Aplicar plantilla rápida por Rol:</span>
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.keys(templates).map(roleKey => (
                                                    <Button 
                                                        key={roleKey}
                                                        variant={userRole === roleKey ? 'primary' : 'outline-secondary'}
                                                        size="sm"
                                                        onClick={() => handleApplyTemplate(roleKey)}
                                                        className="d-flex align-items-center gap-1 rounded-pill px-3"
                                                    >
                                                        {roleKey === 'ADMIN' ? <Icons.ShieldCheck size={14} /> : <Icons.UserCheck size={14} />}
                                                        {roleKey}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Custom Role Input */}
                                        <Row className="mb-4">
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-semibold text-dark small">Editar Rol del Usuario</Form.Label>
                                                    <Form.Control 
                                                        type="text" 
                                                        value={userRole} 
                                                        onChange={(e) => setUserRole(e.target.value.toUpperCase())}
                                                        placeholder="Ej: VENDEDOR, CONTADOR"
                                                        style={{ borderRadius: '8px', textTransform: 'uppercase' }}
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Define un identificador de rol para clasificar al usuario.
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        {/* Modules Cards Grid */}
                                        <h6 className="fw-bold mb-3 d-flex align-items-center gap-1">
                                            <Icons.Adjustments size={18} className="text-primary" /> Módulos Disponibles ({selectedModules.length} seleccionados)
                                        </h6>
                                        
                                        <Row className="row-cols-1 row-cols-md-2 g-3">
                                            {SYSTEM_MODULES.map(m => {
                                                const isChecked = selectedModules.includes(m.id);
                                                return (
                                                    <Col key={m.id}>
                                                        <Card 
                                                            className={`border-2 cursor-pointer h-100 hover-card-effect transition-all`}
                                                            style={{ 
                                                                borderRadius: '10px',
                                                                borderColor: isChecked ? m.color : '#e2e8f0',
                                                                backgroundColor: isChecked ? `${m.color}05` : 'transparent',
                                                            }}
                                                            onClick={() => handleModuleToggle(m.id)}
                                                        >
                                                            <Card.Body className="p-3 d-flex gap-3 align-items-start">
                                                                <div className="pt-1">
                                                                    <Form.Check 
                                                                        type="checkbox"
                                                                        id={`check-${m.id}`}
                                                                        checked={isChecked}
                                                                        onChange={() => {}} // Controlled by Card onClick
                                                                        style={{ transform: 'scale(1.2)' }}
                                                                    />
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                                        <div className="p-1 rounded bg-light d-flex align-items-center justify-content-center">
                                                                            {renderIcon(m.icon, 18, isChecked ? m.color : '#64748b')}
                                                                        </div>
                                                                        <span className="fw-bold" style={{ color: isChecked ? m.color : '#1e293b' }}>
                                                                            {m.name}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-muted small mb-0" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                                                        {m.desc}
                                                                    </p>
                                                                </div>
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>

                                    </Card.Body>
                                </Card>
                            ) : (
                                <Card className="border-0 shadow-sm py-5 text-center text-muted" style={{ borderRadius: '12px' }}>
                                    <Card.Body>
                                        <Icons.Users size={48} className="mb-2 text-muted-light" />
                                        <h5>Ningún usuario seleccionado</h5>
                                        <p className="small">Haz clic sobre un usuario en la lista de la izquierda para comenzar a personalizar sus permisos.</p>
                                    </Card.Body>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </Tab>

                {/* TAB 2: ROLE TEMPLATES MANAGEMENT */}
                <Tab eventKey="templates" title={<span><Icons.Template size={16} className="me-1" /> Plantillas de Roles</span>}>
                    <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-3">🛠️ Configuración de Plantillas de Roles</h5>
                            <p className="text-muted">Las plantillas definen combinaciones preestablecidas de módulos. Cuando creas o modificas usuarios, puedes aplicar estas plantillas rápidamente.</p>
                            
                            <Row className="mt-4">
                                {Object.keys(templates).map(roleKey => (
                                    <Col md={6} lg={4} className="mb-4" key={roleKey}>
                                        <Card className="border shadow-sm h-100" style={{ borderRadius: '10px' }}>
                                            <Card.Header className="bg-light border-0 d-flex justify-content-between align-items-center py-3">
                                                <span className="fw-bold text-dark">{roleKey}</span>
                                                <Badge bg={roleKey === 'ADMIN' ? 'danger' : 'secondary'} className="px-2 py-1">
                                                    {templates[roleKey].length} Módulos
                                                </Badge>
                                            </Card.Header>
                                            <Card.Body className="p-3">
                                                <div className="d-flex flex-wrap gap-1 mb-3" style={{ minHeight: '60px' }}>
                                                    {templates[roleKey].length === 0 ? (
                                                        <span className="text-muted small italic">Sin accesos habilitados.</span>
                                                    ) : (
                                                        templates[roleKey].map(mId => {
                                                            const modObj = SYSTEM_MODULES.find(sm => sm.id === mId);
                                                            return (
                                                                <Badge 
                                                                    key={mId} 
                                                                    bg="light" 
                                                                    text="dark" 
                                                                    className="border d-flex align-items-center gap-1 px-2 py-1"
                                                                >
                                                                    {modObj ? renderIcon(modObj.icon, 11, modObj.color) : null}
                                                                    {modObj ? modObj.name : mId}
                                                                </Badge>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm" 
                                                    className="w-100 d-flex align-items-center justify-content-center gap-1"
                                                    onClick={() => {
                                                        setUserRole(roleKey);
                                                        setSelectedModules(templates[roleKey]);
                                                        // Toggle to first tab
                                                        const detailedTabLink = document.querySelector('[data-rr-ui-event-key="detailed"]');
                                                        if (detailedTabLink) detailedTabLink.click();
                                                        showAlert('info', `Cargado rol "${roleKey}" en el editor de permisos.`);
                                                    }}
                                                >
                                                    <Icons.Edit size={14} /> Editar en Editor
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Custom Styles */}
            <style jsx global>{`
                .cursor-pointer {
                    cursor: pointer;
                }
                .transition-all {
                    transition: all 0.2s ease-in-out;
                }
                .hover-card-effect:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .text-xs {
                    font-size: 11px;
                }
                .bg-gradient {
                    background-size: 200% 200%;
                }
                .text-muted-light {
                    color: rgba(255, 255, 255, 0.7);
                }
                .bg-white-translucent {
                    background-color: rgba(255, 255, 255, 0.15);
                }
                .custom-tabs-nav .nav-link {
                    color: #475569;
                    font-weight: 500;
                    border: none;
                    border-bottom: 2px solid transparent;
                    padding: 10px 16px;
                }
                .custom-tabs-nav .nav-link.active {
                    color: #0d6efd !important;
                    border-bottom: 2px solid #0d6efd !important;
                    background-color: transparent !important;
                }
            `}</style>
        </Container>
    );
}
