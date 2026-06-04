/**
 * Calculations Utility
 * Các công thức tính toán cho hình học 3D
 */

const Calculations = {
    // Hình lập phương
    cube: {
        volume: (a) => Math.pow(a, 3),
        surfaceArea: (a) => 6 * Math.pow(a, 2),
        vertices: 8,
        edges: 12,
        faces: 6
    },

    // Hình hộp chữ nhật
    rectangularPrism: {
        volume: (a, b, c) => a * b * c,
        surfaceArea: (a, b, c) => 2 * (a * b + b * c + a * c),
        vertices: 8,
        edges: 12,
        faces: 6
    },

    // Hình chóp tứ giác đều
    pyramid: {
        volume: (a, h) => (1 / 3) * Math.pow(a, 2) * h,
        surfaceArea: (a, h) => {
            const slantHeight = Math.sqrt(Math.pow(h, 2) + Math.pow(a / 2, 2));
            return Math.pow(a, 2) + 2 * a * slantHeight;
        },
        vertices: 5,
        edges: 8,
        faces: 5
    },

    // Hình cầu
    sphere: {
        volume: (r) => (4 / 3) * Math.PI * Math.pow(r, 3),
        surfaceArea: (r) => 4 * Math.PI * Math.pow(r, 2),
        vertices: 0, // Không có đỉnh
        edges: 0,    // Không có cạnh
        faces: 1     // 1 mặt cong
    },

    // Hình trụ
    cylinder: {
        volume: (r, h) => Math.PI * Math.pow(r, 2) * h,
        surfaceArea: (r, h) => 2 * Math.PI * r * (r + h),
        vertices: 0, // Không có đỉnh (mặt cong)
        edges: 2,    // 2 đường tròn
        faces: 3     // 2 đáy + 1 mặt bên
    },

    // Format số
    formatNumber: (num, decimals = 2) => {
        if (num === 0) return '0';
        if (Math.abs(num) < 0.01) return num.toExponential(decimals);
        return parseFloat(num.toFixed(decimals)).toString();
    },

    // Easing functions
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    }
};
