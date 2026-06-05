/**
 * CircleShape - Hình tròn
 */

class CircleShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.radius = 3;

        this.mesh = null;
        this.edgeLine = null;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        const geometry = new THREE.CircleGeometry(this.radius, 64);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshPhongMaterial({
            color: 0xe91e63,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.group.add(this.mesh);

        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.edgeLine = new THREE.LineSegments(edges, lineMaterial);
        this.group.add(this.edgeLine);
    }

    updateParams(params) {
        if (params.radius) this.radius = params.radius;
        this.createShape();
    }

    getStats() {
        const calc = Calculations.circle;
        return {
            volume: '---',
            area: Calculations.formatNumber(calc.area(this.radius)),
            perimeter: Calculations.formatNumber(calc.perimeter(this.radius))
        };
    }

    getControls() {
        return [
            {
                id: 'radius',
                label: 'BÁN KÍNH (R)',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.radius,
                unit: 'cm'
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'radius') {
            this.updateParams({ radius: parseFloat(value) });
        }
    }

    dispose() {
        this.scene.remove(this.group);
    }
}
