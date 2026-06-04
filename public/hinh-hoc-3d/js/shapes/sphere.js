/**
 * Sphere Shape - Hình cầu
 */

class SphereShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.radius = 2;
        this.opacity = 0.8;
        this.showWireframe = true;
        this.segments = 32;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        // Clear existing
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        // Main sphere
        const geometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments);

        // Gradient-like material
        const material = new THREE.MeshPhongMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide,
            shininess: 100
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mesh);

        // Wireframe overlay
        if (this.showWireframe) {
            const wireGeometry = new THREE.SphereGeometry(this.radius * 1.001, 16, 16);
            const wireMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            this.wireframe = new THREE.Mesh(wireGeometry, wireMaterial);
            this.group.add(this.wireframe);
        }

        // Equator and meridians
        this.createGuideLines();

        // Center point
        this.createCenterPoint();
    }

    createGuideLines() {
        // Equator (horizontal circle)
        const equatorGeometry = new THREE.RingGeometry(this.radius - 0.01, this.radius + 0.01, 64);
        const equatorMaterial = new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide
        });
        const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
        equator.rotation.x = Math.PI / 2;
        this.group.add(equator);

        // Prime meridian (vertical circle)
        const meridianGeometry = new THREE.TorusGeometry(this.radius, 0.02, 8, 64);
        const meridianMaterial = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const meridian = new THREE.Mesh(meridianGeometry, meridianMaterial);
        this.group.add(meridian);

        // Another meridian perpendicular
        const meridian2 = new THREE.Mesh(meridianGeometry, meridianMaterial);
        meridian2.rotation.y = Math.PI / 2;
        this.group.add(meridian2);
    }

    createCenterPoint() {
        const pointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        const centerPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        this.group.add(centerPoint);

        // Radius line
        const radiusLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(this.radius, 0, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const line = new THREE.Line(radiusLine, lineMaterial);
        this.group.add(line);

        // Radius label point
        const labelPoint = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x22d3ee })
        );
        labelPoint.position.set(this.radius, 0, 0);
        this.group.add(labelPoint);
    }

    updateRadius(radius) {
        this.radius = radius;
        this.createShape();
    }

    updateOpacity(opacity) {
        this.opacity = opacity;
        if (this.mesh && this.mesh.material) {
            this.mesh.material.opacity = opacity;
        }
    }

    toggleWireframe() {
        this.showWireframe = !this.showWireframe;
        this.createShape();
        return this.showWireframe;
    }

    getStats() {
        const calc = Calculations.sphere;
        return {
            vertices: calc.vertices,
            edges: calc.edges,
            faces: calc.faces,
            volume: Calculations.formatNumber(calc.volume(this.radius)),
            area: Calculations.formatNumber(calc.surfaceArea(this.radius))
        };
    }

    getControls() {
        return [
            {
                id: 'radius',
                label: 'BÁN KÍNH',
                min: 0.5,
                max: 4,
                step: 0.1,
                value: this.radius,
                unit: ''
            },
            {
                id: 'opacity',
                label: 'ĐỘ TRONG SUỐT',
                min: 0.1,
                max: 1,
                step: 0.1,
                value: this.opacity,
                unit: ''
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'radius') {
            this.updateRadius(parseFloat(value));
        } else if (id === 'opacity') {
            this.updateOpacity(parseFloat(value));
        }
    }

    setVisibility(options) {
        // Sphere doesn't have distinct vertices/edges/faces like polyhedra
        // Just toggle wireframe for edges
        if (this.wireframe) {
            this.wireframe.visible = options.edges;
        }
        if (this.mesh) {
            this.mesh.visible = options.faces;
        }
    }

    setUnfoldProgress(progress) {
        // Sphere cannot be unfolded like polyhedra
        // Show a visual effect instead (scaling/flattening)
        if (this.mesh) {
            const t = Calculations.easing.easeInOutCubic(progress);
            this.mesh.scale.y = 1 - (t * 0.5);
        }
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
