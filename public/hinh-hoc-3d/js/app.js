/**
 * Main Application Controller
 * HỌC HÌNH HỌC 3D - NTĐ- GV yêu CN
 */

class App {
    constructor() {
        this.currentShape = null;
        this.currentShapeType = 'cube';

        // Visibility states
        this.showVertices = true;
        this.showEdges = true;
        this.showFaces = true;
        this.showLabels = false;
        this.unfoldProgress = 0;

        this.initThreeJS();
        this.initEventListeners();
        this.selectShape('cube'); // Gọi selectShape để render dynamic params
        this.animate();
    }

    initThreeJS() {
        // Get canvas
        this.canvas = document.getElementById('canvas3d');

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);

        // Lighting
        this.setupLighting();

        // Grid helper - đặt ở dưới để không đâm qua hình
        const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
        gridHelper.position.y = -3; // Đẩy lưới xuống dưới
        this.scene.add(gridHelper);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 20;

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Directional lights
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(5, 10, 5);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 0.3);
        dirLight2.position.set(-5, 5, -5);
        this.scene.add(dirLight2);

        // Point light for highlights
        const pointLight = new THREE.PointLight(0x6366f1, 0.5, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }

    initEventListeners() {
        // Shape selection buttons (new compact grid)
        document.querySelectorAll('.shape-icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.currentTarget.disabled) return;
                const shapeType = e.currentTarget.dataset.shape;
                this.selectShape(shapeType);
            });
        });

        // Toggle buttons
        document.getElementById('toggle-vertices')?.addEventListener('click', (e) => {
            this.showVertices = !this.showVertices;
            e.currentTarget.classList.toggle('active', this.showVertices);
            this.updateVisibility();
        });

        document.getElementById('toggle-edges')?.addEventListener('click', (e) => {
            this.showEdges = !this.showEdges;
            e.currentTarget.classList.toggle('active', this.showEdges);
            this.updateVisibility();
        });

        document.getElementById('toggle-faces')?.addEventListener('click', (e) => {
            this.showFaces = !this.showFaces;
            e.currentTarget.classList.toggle('active', this.showFaces);
            this.updateVisibility();
        });

        document.getElementById('toggle-labels')?.addEventListener('click', (e) => {
            this.showLabels = !this.showLabels;
            e.currentTarget.classList.toggle('active', this.showLabels);
            this.updateVisibility();
        });

        // Explore/Volume mode buttons
        document.getElementById('btn-explore')?.addEventListener('click', (e) => {
            document.getElementById('btn-explore')?.classList.add('active');
            document.getElementById('btn-volume')?.classList.remove('active');
            if (this.currentShape && typeof this.currentShape.setMode === 'function') {
                this.currentShape.setMode('explore');
            }
        });

        document.getElementById('btn-volume')?.addEventListener('click', (e) => {
            document.getElementById('btn-volume')?.classList.add('active');
            document.getElementById('btn-explore')?.classList.remove('active');
            this.toggleVolumeVisualization();
        });

        // Unfold slider
        document.getElementById('control-unfold')?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.setUnfold(value);
            this.stopAutoUnfold(); // Stop auto if manual control is used
        });

        // Auto Unfold buttons
        this.btnAutoUnfold = document.getElementById('btn-auto-unfold');
        this.btnLoopUnfold = document.getElementById('btn-loop-unfold');
        this.inputSpeed = document.getElementById('control-speed');

        this.btnAutoUnfold?.addEventListener('click', () => {
            this.toggleAutoUnfold();
        });

        this.btnLoopUnfold?.addEventListener('click', (e) => {
            this.isLooping = !this.isLooping;
            e.currentTarget.classList.toggle('active', this.isLooping);
        });

        // Reset button
        document.getElementById('btn-reset')?.addEventListener('click', () => {
            this.resetShape();
            this.stopAutoUnfold();
            this.setUnfold(0);
        });

        // Stats toggle
        document.getElementById('toggle-stats')?.addEventListener('change', (e) => {
            const statsContent = document.querySelector('.stats-content');
            if (statsContent) {
                statsContent.style.display = e.target.checked ? 'flex' : 'none';
            }
        });

        // Fullscreen buttons
        const fullscreenHandler = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen error:', err);
                });
            } else {
                document.exitFullscreen();
            }
        };

        document.getElementById('btn-fullscreen')?.addEventListener('click', fullscreenHandler);
        document.getElementById('btn-fullscreen-footer')?.addEventListener('click', fullscreenHandler);

        // QR Modal handlers
        const qrModal = document.getElementById('qr-modal');
        document.getElementById('btn-show-qr')?.addEventListener('click', () => {
            qrModal?.classList.remove('hidden');
        });
        document.getElementById('btn-close-qr')?.addEventListener('click', () => {
            qrModal?.classList.add('hidden');
        });
        qrModal?.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                qrModal.classList.add('hidden');
            }
        });
    }

    setUnfold(value) {
        this.unfoldProgress = value;
        const slider = document.getElementById('control-unfold');
        const display = document.getElementById('value-unfold');

        if (slider) slider.value = value;
        if (display) display.textContent = Math.round(value) + '%';

        if (this.currentShapeType === 'cylinder') {
            this.updateIframeParams({ unfoldProgress: value });
        } else if (this.currentShape && typeof this.currentShape.setUnfoldProgress === 'function') {
            this.currentShape.setUnfoldProgress(value / 100);
        }
    }

    toggleAutoUnfold() {
        if (this.isAutoUnfolding) {
            this.stopAutoUnfold();
        } else {
            this.startAutoUnfold();
        }
    }

    startAutoUnfold() {
        if (this.isAutoUnfolding) return;
        this.isAutoUnfolding = true;
        this.btnAutoUnfold.classList.add('active');
        this.btnAutoUnfold.innerHTML = '<span class="icon">⏸️</span> Tạm dừng';

        this.autoUnfoldDirection = 1;
        // If already at end, start closing
        if (this.unfoldProgress >= 100) this.autoUnfoldDirection = -1;

        this.lastFrameTime = performance.now();
        this.animateAutoUnfold();
    }

    stopAutoUnfold() {
        this.isAutoUnfolding = false;
        if (this.btnAutoUnfold) {
            this.btnAutoUnfold.classList.remove('active');
            this.btnAutoUnfold.innerHTML = '<span class="icon">▶️</span> Tự động';
        }
    }

    animateAutoUnfold() {
        if (!this.isAutoUnfolding) return;

        const now = performance.now();
        const delta = (now - this.lastFrameTime) / 1000; // seconds
        this.lastFrameTime = now;

        const speed = parseFloat(this.inputSpeed?.value || 1) * 30; // base speed 30%/sec

        let newValue = this.unfoldProgress + (speed * delta * this.autoUnfoldDirection);

        // Luôn loop liên tục - đổi hướng khi đến biên
        if (newValue >= 100) {
            newValue = 100;
            this.autoUnfoldDirection = -1; // Đảo hướng: đóng lại
        } else if (newValue <= 0) {
            newValue = 0;
            this.autoUnfoldDirection = 1; // Đảo hướng: mở ra
        }

        this.setUnfold(newValue);
        requestAnimationFrame(() => this.animateAutoUnfold());
    }

    updateVisibility() {
        if (!this.currentShape) return;

        if (typeof this.currentShape.setVisibility === 'function') {
            this.currentShape.setVisibility({
                vertices: this.showVertices,
                edges: this.showEdges,
                faces: this.showFaces,
                labels: this.showLabels
            });
        }
    }

    selectShape(shapeType) {
        // Update button states
        document.querySelectorAll('.shape-icon-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-shape="${shapeType}"]`)?.classList.add('active');

        // Update shape name displays
        const shapeNames = {
            'cube': 'HÌNH LẬP PHƯƠNG',
            'rectangular-prism': 'HÌNH HỘP CHỮ NHẬT',
            'pyramid': 'HÌNH CHÓP TỨ GIÁC',
            'sphere': 'HÌNH CẦU',
            'cylinder': 'HÌNH TRỤ'
        };
        const shapeName = shapeNames[shapeType] || 'HÌNH 3D';

        const nameBox = document.getElementById('current-shape-name');
        if (nameBox) nameBox.textContent = shapeName;

        const nameOverlay = document.getElementById('shape-name-overlay');
        if (nameOverlay) nameOverlay.textContent = shapeName;

        const iframe = document.getElementById('hinhtru3d-iframe');
        const canvas = document.getElementById('canvas3d');
        const canvasOverlays = document.querySelectorAll('.shape-name-overlay, .canvas-actions, .canvas-hint');

        if (shapeType === 'cylinder') {
            iframe?.classList.remove('hidden');
            if (canvas) canvas.style.display = 'none';
            canvasOverlays.forEach(el => el.style.display = 'none');

            if (this.currentShape) {
                this.currentShape.dispose();
                this.currentShape = null;
            }

            this.sendToIframe({ type: 'HIDE_CONTROL_PANEL' });
            this.updateIframeParams({
                unfoldProgress: this.unfoldProgress,
                radius: parseFloat(document.getElementById('control-radius')?.value || 2),
                height: parseFloat(document.getElementById('control-height')?.value || 4),
                opacity: parseFloat(document.getElementById('control-opacity')?.value || 85)
            });
        } else {
            iframe?.classList.add('hidden');
            if (canvas) canvas.style.display = 'block';
            canvasOverlays.forEach(el => el.style.display = '');

            this.loadShape(shapeType);
        }

        // Render dynamic parameters for this shape (always)
        this.renderDynamicParams(shapeType);

        this.updateLessonContent();
    }

    sendToIframe(message) {
        const iframe = document.getElementById('hinhtru3d-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(message, '*');
        }
    }

    updateIframeParams(params) {
        this.sendToIframe({
            type: 'UPDATE_PARAMS',
            ...params
        });
    }

    renderDynamicParams(shapeType) {
        const container = document.getElementById('dynamic-params-container');
        if (!container) return;

        // Define shape parameters
        const SHAPE_PARAMS = {
            'cube': [
                { id: 'size', label: '📏 CẠNH (a)', min: 1, max: 6, step: 0.5, default: 3, unit: 'cm' }
            ],
            'rectangular-prism': [
                { id: 'width', label: '📏 DÀI (a)', min: 1, max: 6, step: 0.5, default: 4, unit: 'cm' },
                { id: 'height', label: '📐 RỘNG (b)', min: 1, max: 6, step: 0.5, default: 3, unit: 'cm' },
                { id: 'depth', label: '📏 CAO (c)', min: 1, max: 6, step: 0.5, default: 2, unit: 'cm' }
            ],
            'pyramid': [
                { id: 'base', label: '📏 CẠNH ĐÁY (a)', min: 1, max: 6, step: 0.5, default: 3, unit: 'cm' },
                { id: 'height', label: '📐 CHIỀU CAO (h)', min: 1, max: 8, step: 0.5, default: 4, unit: 'cm' }
            ],
            'sphere': [
                { id: 'radius', label: '📏 BÁN KÍNH (r)', min: 1, max: 5, step: 0.5, default: 2, unit: 'cm' }
            ],
            'cylinder': [
                { id: 'radius', label: '📏 BÁN KÍNH (r)', min: 1, max: 5, step: 0.5, default: 2, unit: 'cm' },
                { id: 'height', label: '📐 CHIỀU CAO (h)', min: 2, max: 8, step: 0.5, default: 4, unit: 'cm' }
            ]
        };

        const params = SHAPE_PARAMS[shapeType] || [];

        container.innerHTML = params.map(param => `
            <div class="slider-container">
                <div class="slider-header">
                    <label class="slider-label">${param.label}</label>
                    <span class="slider-value" id="value-${param.id}">${param.default} ${param.unit}</span>
                </div>
                <input type="range" class="slider-range" id="control-${param.id}" 
                       min="${param.min}" max="${param.max}" step="${param.step}" value="${param.default}">
                <div class="slider-bounds">
                    <span>${param.min}${param.unit}</span>
                    <span>${param.max}${param.unit}</span>
                </div>
            </div>
        `).join('');

        // Store current shape type for reference
        this.currentShapeType = shapeType;

        // Add event listeners for dynamic sliders
        params.forEach(param => {
            const slider = document.getElementById(`control-${param.id}`);
            const valueDisplay = document.getElementById(`value-${param.id}`);
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    valueDisplay.textContent = `${value} ${param.unit}`;

                    if (this.currentShapeType === 'cylinder') {
                        this.updateIframeParams({ [param.id]: value });
                    } else if (this.currentShape && typeof this.currentShape.handleControl === 'function') {
                        this.currentShape.handleControl(param.id, value);
                    }
                    this.updateStats();
                });
            }
        });

        if (shapeType === 'cylinder') {
            const unfoldSlider = document.getElementById('control-unfold');
            if (unfoldSlider) {
                unfoldSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.updateIframeParams({ unfoldProgress: value });
                });
            }

            const opacitySlider = document.getElementById('control-opacity');
            if (opacitySlider) {
                opacitySlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.updateIframeParams({ opacity: value });
                });
            }
        }
    }

    loadShape(shapeType) {
        // Dispose current shape
        if (this.currentShape) {
            this.currentShape.dispose();
        }

        this.currentShapeType = shapeType;

        // Create new shape
        switch (shapeType) {
            case 'cube':
                this.currentShape = new CubeShape(this.scene);
                break;
            case 'rectangular-prism':
                this.currentShape = new RectangularPrismShape(this.scene);
                break;
            case 'pyramid':
                this.currentShape = new PyramidShape(this.scene);
                break;
            case 'sphere':
                this.currentShape = new SphereShape(this.scene);
                break;
            case 'cylinder':
                this.currentShape = new CylinderShape(this.scene);
                break;
        }

        // Update UI
        this.updateControls();
        this.updateStats();
    }

    updateLessonContent() {
        const infoContent = document.getElementById('info-content');
        const infoPanel = document.getElementById('info-panel');

        if (!infoContent || !infoPanel) return;

        if (this.currentShape && typeof this.currentShape.getLessonContent === 'function') {
            const content = this.currentShape.getLessonContent();
            if (content) {
                infoContent.innerHTML = content;
                infoPanel.style.display = 'block';
                // Trigger reflow for animation if needed
                setTimeout(() => infoPanel.style.opacity = '1', 10);
            } else {
                infoPanel.style.display = 'none';
                infoPanel.style.opacity = '0';
            }
        } else {
            infoPanel.style.display = 'none';
            infoPanel.style.opacity = '0';
        }
    }

    updateControls() {
        const container = document.getElementById('controls-container');
        if (!container || !this.currentShape) return;

        const controls = this.currentShape.getControls();

        container.innerHTML = controls.map(ctrl => `
            <div class="control-item">
                <div class="control-row">
                    <span>${ctrl.label}</span>
                    <span id="value-${ctrl.id}">${ctrl.value}${ctrl.unit}</span>
                </div>
                <input type="range" 
                    id="control-${ctrl.id}" 
                    min="${ctrl.min}" 
                    max="${ctrl.max}" 
                    step="${ctrl.step}" 
                    value="${ctrl.value}"
                    data-control-id="${ctrl.id}">
            </div>
        `).join('');

        // Add event listeners for sliders
        controls.forEach(ctrl => {
            const input = document.getElementById(`control-${ctrl.id}`);
            if (input) {
                input.addEventListener('input', (e) => {
                    const value = e.target.value;
                    document.getElementById(`value-${ctrl.id}`).textContent = value + ctrl.unit;
                    this.currentShape.handleControl(ctrl.id, value);
                    this.updateStats();
                });
            }
        });
    }

    updateStats() {
        if (!this.currentShape) return;

        const stats = this.currentShape.getStats();

        // Update sidebar stats
        const areaEl = document.getElementById('stat-area');
        const volumeEl = document.getElementById('stat-volume');
        if (areaEl) areaEl.textContent = stats.area;
        if (volumeEl) volumeEl.textContent = stats.volume;

        // Update bottom stats
        const verticesEl = document.getElementById('stat-vertices-bottom');
        const edgesEl = document.getElementById('stat-edges-bottom');
        const facesEl = document.getElementById('stat-faces-bottom');
        const areaBottomEl = document.getElementById('stat-area-bottom');
        const volumeBottomEl = document.getElementById('stat-volume-bottom');

        if (verticesEl) verticesEl.textContent = stats.vertices;
        if (edgesEl) edgesEl.textContent = stats.edges;
        if (facesEl) facesEl.textContent = stats.faces;
        if (areaBottomEl) areaBottomEl.textContent = stats.area;
        if (volumeBottomEl) volumeBottomEl.textContent = stats.volume;
    }

    toggleUnfold() {
        // TODO: Implement unfold animation
        console.log('Unfold feature coming soon!');
    }

    toggleVolumeVisualization() {
        if (this.currentShape && typeof this.currentShape.toggleUnitCubes === 'function') {
            const active = this.currentShape.toggleUnitCubes();
            document.getElementById('btn-volume')?.classList.toggle('active', active);
        }
    }

    resetShape() {
        this.loadShape(this.currentShapeType);

        // Reset camera
        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    onWindowResize() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
