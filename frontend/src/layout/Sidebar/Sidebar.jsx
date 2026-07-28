/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from 'react';
import { Button, Card, Nav, NavLink } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import SidebarHeader from './SidebarHeader';
import { SidebarMenu } from './SidebarMenu';
import classNames from 'classnames';
import Link from 'next/link';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { usePathname } from 'next/navigation';
import { useTheme } from '../theme-provider/theme-provider';

const Sidebar = () => {
    const { dispatch } = useGlobalStateContext();
    const [activeMenu, setActiveMenu] = useState();
    const [activeSubMenu, setActiveSubMenu] = useState();
    const pathname = usePathname();
    const { theme } = useTheme();

    const [userModules, setUserModules] = useState('');
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const updatePermissions = () => {
            setUserModules(localStorage.getItem('modules') || '');
            setUserRole(localStorage.getItem('role') || '');
        };
        
        updatePermissions();
        window.addEventListener('storage', updatePermissions);
        return () => {
            window.removeEventListener('storage', updatePermissions);
        };
    }, []);

    useEffect(() => {
        require("bootstrap/js/dist/collapse");
    }, []);

    useEffect(() => {
        const currentMenu = SidebarMenu.flatMap(r => r.contents).find(m => m.path && m.path !== '/' && pathname.startsWith(m.path));
        if (currentMenu) {
            setActiveMenu(currentMenu.name);
        }
    }, [pathname]);

    const handleClick = (menuName) => {
        setActiveMenu(menuName);
    }

    const matchesModule = (menu, moduleName) => {
        if (!menu) return false;
        const path = menu.path || '';
        const id = menu.id || '';
        
        switch (moduleName) {
            case 'dashboard':
                return path.startsWith('/dashboard');
            case 'chat':
                return path.startsWith('/apps/chat');
            case 'contactos':
                return id === 'menu_contactos' || path.startsWith('/apps/contact');
            case 'oportunidades':
                return id === 'menu_oportunidades' || path.startsWith('/opportunities');
            case 'pedidos':
                return id === 'menu_pedidos' || path.startsWith('/pedidos');
            case 'ventas':
                return id === 'menu_ventas' || path.startsWith('/ventas');
            case 'productos':
                return id === 'menu_productos' || path.startsWith('/productos');
            case 'inventarios':
                return id === 'menu_inventarios' || path.startsWith('/inventarios');
            case 'finanzas':
                return id === 'menu_finanzas' || path.startsWith('/finanzas');
            case 'personal':
                return id === 'menu_personal' || path.startsWith('/payroll');
            case 'admin':
                return id === 'menu_admin' || path.startsWith('/admin');
            default:
                return false;
        }
    };

    const isModuleAllowed = (menu) => {
        if (userRole === 'ADMIN') return true;
        if (!userModules) {
            if (userRole === 'USER') {
                const defaultUserModules = ['dashboard', 'chat', 'contactos'];
                return defaultUserModules.some(m => matchesModule(menu, m));
            }
            return true;
        }
        const allowedModules = userModules.split(',').map(m => m.trim().toLowerCase());
        return allowedModules.some(m => matchesModule(menu, m));
    };

    return (
        <>
            <div className="hk-menu">
                {/* Brand */}
                <SidebarHeader />
                {/* Main Menu */}
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        {SidebarMenu.map((routes, index) => {
                            const allowedContents = routes.contents.filter(isModuleAllowed);
                            if (allowedContents.length === 0) return null;
                            
                            return (
                            <React.Fragment key={index}>
                                <div className="menu-group" >
                                    {routes.group && <div className="nav-header" >
                                        <span>{routes.group}</span>
                                    </div>}
                                    {allowedContents.map((menus, idx) => (
                                        <Nav bsPrefix="navbar-nav" className="flex-column" key={idx}>
                                            <Nav.Item className={classNames({ "active": pathname.startsWith(menus.path) })}>
                                                {
                                                    menus.childrens
                                                        ?
                                                        <>
                                                            <Nav.Link data-bs-toggle="collapse" data-bs-target={`#${menus.id}`} aria-expanded={activeMenu === menus.name ? "true" : "false"} onClick={() => setActiveMenu(menus.name)} >
                                                                <span className={classNames("nav-icon-wrap", { "position-relative": menus.iconBadge })}>
                                                                    {menus.iconBadge && menus.iconBadge}
                                                                    <span className="svg-icon">
                                                                        {menus.icon}
                                                                    </span>
                                                                </span>
                                                                <span className={classNames("nav-link-text", { "position-relative": menus.badgeIndicator })} >
                                                                    {menus.name}
                                                                    {menus.badgeIndicator && menus.badgeIndicator}
                                                                </span>
                                                                {menus.badge && menus.badge}
                                                            </Nav.Link>

                                                            {/* <Collapse in={open}> */}
                                                            <ul id={menus.id} className={classNames("nav flex-column nav-children", { "collapse": activeMenu !== menus.name })}>
                                                                <li className="nav-item">
                                                                    <ul className="nav flex-column">
                                                                        {menus.childrens.map((subMenu, indx) => (
                                                                            subMenu.childrens
                                                                                ?
                                                                                <li className="nav-item" key={indx} >
                                                                                    <Nav.Link as={Link} href={subMenu.path} className="nav-link" data-bs-toggle="collapse" data-bs-target={`#${subMenu.id}`} aria-expanded={activeSubMenu === subMenu.name ? "true" : "false"} onClick={() => setActiveSubMenu(subMenu.name)}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Nav.Link>

                                                                                    {subMenu.childrens.map((childrenPath, i) => (
                                                                                        <ul id={subMenu.id} className={classNames("nav flex-column nav-children", { "collapse": activeSubMenu !== subMenu.name })} key={i}>
                                                                                            <li className="nav-item">
                                                                                                <ul className="nav flex-column">
                                                                                                    <li className="nav-item">
                                                                                                        <Link href={childrenPath.path} onClick={handleClick} className={classNames("nav-link", { "active": pathname === childrenPath.path })}>
                                                                                                            <span className="nav-link-text">
                                                                                                                {childrenPath.name}
                                                                                                            </span>
                                                                                                        </Link>
                                                                                                    </li>
                                                                                                </ul>
                                                                                            </li>
                                                                                        </ul>
                                                                                    ))}

                                                                                </li>
                                                                                :
                                                                                <li className="nav-item" key={indx}>
                                                                                    <Link href={subMenu.path} onClick={handleClick} className={classNames("nav-link", { "active": pathname === subMenu.path })}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Link>
                                                                                </li>
                                                                        ))}
                                                                    </ul>
                                                                </li>
                                                            </ul>
                                                            {/* </Collapse> */}

                                                        </>
                                                        :
                                                        <>
                                                            {
                                                                (routes.group === "Documentation")
                                                                    ?
                                                                    <a className="nav-link" href={menus.path} >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </a>
                                                                    :
                                                                    <Link href={menus.path} onClick={() => handleClick(menus.name)} className={classNames("nav-link", { "active": pathname === menus.path })} >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </Link>
                                                            }
                                                        </>
                                                }
                                            </Nav.Item>
                                        </Nav>
                                    ))}
                                </div>
                                <div className="menu-gap" />
                            </React.Fragment>
                            );
                        })}
                    </div>
                </SimpleBar>
                {/* /Main Menu */}
            </div >
            <div onClick={() => dispatch({ type: 'sidebar_toggle' })} className="hk-menu-backdrop" />
        </>
    )
}



export default Sidebar;
