(function() {
    // 初始化：为所有带 data-target 的菜单项绑定点击事件，控制子菜单显隐
    const toggleButtons = document.querySelectorAll('.menu-link-plain[data-target]');

    function toggleSubmenu(targetId, btnElement) {
        const submenu = document.getElementById(targetId);
        if (!submenu) return;
        const isOpen = submenu.classList.contains('open');
        if (isOpen) {
            submenu.classList.remove('open');
            btnElement.setAttribute('data-open', 'false');
        } else {
            submenu.classList.add('open');
            btnElement.setAttribute('data-open', 'true');
        }
    }

    // 绑定点击事件（事件代理亦可，但直接绑定更清晰）
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                toggleSubmenu(targetId, this);
            }
        });
    });

    // 可选：确保刚开始所有子菜单是关闭状态，但data-open属性同步
    document.querySelectorAll('.submenu').forEach(sub => {
        sub.classList.remove('open');
    });
    document.querySelectorAll('.menu-link-plain[data-target]').forEach(btn => {
        btn.setAttribute('data-open', 'false');
    });

    // 移动端侧边栏控制
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }

    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // 当窗口大小改变时，如果从移动端切换到宽屏，确保侧边栏可见（移除强制transform）
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // 大屏幕下如果侧边栏因为移动端类而隐藏，强行清除open class
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
            if (overlay.classList.contains('active')) {
                overlay.classList.remove('active');
            }
        }
    });
})();