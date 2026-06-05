/**
 * TrapezoidShape - Hình thang cân
 */

class TrapezoidShape {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.topBase = 2; // Đáy nhỏ
        this.bottomBase = 5; // Đáy lớn
        this.height = 3; // Chiều cao

        this.mesh = null;
        this.edgeLine = null;

        this.createShape();
        this.scene.add(this.group);
    }

    createShape() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        const shape = new THREE.Shape();
        const halfTop = this.topBase / 2;
        const halfBottom = this.bottomBase / 2;
        const halfHeight = this.height / 2;

        // Vertices (CCW)
        // Bottom-right
        shape.moveTo(halfBottom, -halfHeight);
        // Top-right
        shape.lineTo(halfTop, halfHeight);
        // Top-left
        shape.lineTo(-halfTop, halfHeight);
        // Bottom-left
        shape.lineTo(-halfBottom, -halfHeight);
        // Close
        shape.lineTo(halfBottom, -halfHeight);

        const geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshPhongMaterial({
            color: 0x9c27b0,
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
        if (params.topBase) this.topBase = params.topBase;
        if (params.bottomBase) this.bottomBase = params.bottomBase;
        if (params.height) this.height = params.height;
        this.createShape();
    }

    getStats() {
        const calc = Calculations.trapezoid;
        return {
            volume: '---',
            area: Calculations.formatNumber(calc.area(this.topBase, this.bottomBase, this.height)),
            perimeter: Calculations.formatNumber(calc.perimeter(this.topBase, this.bottomBase, this.height))
        };
    }

    getControls() {
        return [
            {
                id: 'topBase',
                label: 'ĐÁY NHỎ (a)',
                min: 1,
                max: 5,
                step: 0.1,
                value: this.topBase,
                unit: 'cm'
            },
            {
                id: 'bottomBase',
                label: 'ĐÁY LỚN (b)',
                min: 2,
                max: 8,
                step: 0.1,
                value: this.bottomBase,
                unit: 'cm'
            },
            {
                id: 'height',
                label: 'CHIỀU CAO (h)',
                min: 1,
                max: 6,
                step: 0.1,
                value: this.height,
                unit: 'cm'
            }
        ];
    }

    handleControl(id, value) {
        if (id === 'topBase') this.updateParams({ topBase: parseFloat(value) });
        else if (id === 'bottomBase') this.updateParams({ bottomBase: parseFloat(value) });
        else if (id === 'height') this.updateParams({ height: parseFloat(value) });
    }

    dispose() {
        this.scene.remove(this.group);
    }
}
