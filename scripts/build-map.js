#!/usr/bin/env node
/* Rebuild the China map asset used by the home page.
 *
 * The source is a full-resolution ECharts GeoJSON (about 580 KB). The home
 * map is only 380px tall, so 8-decimal coordinates and province metadata are
 * wasted bytes and extra parse time. This script:
 *   - rounds coordinates to 3 decimals;
 *   - simplifies each ring with Douglas-Peucker (default 0.02°, roughly
 *     2 km, well below one pixel at the rendered size);
 *   - keeps only the properties ECharts needs (name, adcode);
 *   - writes compact JSON.
 *
 * Usage: node scripts/build-map.js [--tolerance=0.02]
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'assets/data/china-map.json');
const targetPath = path.join(root, 'assets/data/china-map.simplified.json');

const arg = process.argv.find(value => value.startsWith('--tolerance='));
const tolerance = arg ? Number(arg.split('=')[1]) : 0.02;

function roundPoint(point) {
    return [Math.round(point[0] * 1000) / 1000, Math.round(point[1] * 1000) / 1000];
}

function pointDistance(point, start, end) {
    const [x, y] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function simplifyLine(points, tol) {
    if (points.length < 3) return points;
    let maxDistance = 0;
    let index = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
        const distance = pointDistance(points[i], points[0], points[points.length - 1]);
        if (distance > maxDistance) {
            maxDistance = distance;
            index = i;
        }
    }
    if (maxDistance <= tol) return [points[0], points[points.length - 1]];
    const left = simplifyLine(points.slice(0, index + 1), tol);
    const right = simplifyLine(points.slice(index), tol);
    return left.slice(0, -1).concat(right);
}

function simplifyRing(ring, tol) {
    const rounded = ring.map(roundPoint);
    const simplified = simplifyLine(rounded, tol);
    const closed = simplified[0][0] === simplified[simplified.length - 1][0]
        && simplified[0][1] === simplified[simplified.length - 1][1];
    const result = closed ? simplified : simplified.concat([simplified[0]]);
    return result.length >= 4 ? result : rounded;
}

function simplifyCoordinates(coordinates, tol) {
    if (typeof coordinates[0][0] === 'number') {
        return simplifyRing(coordinates, tol);
    }
    return coordinates.map(part => simplifyCoordinates(part, tol));
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const features = source.features.map(feature => ({
    type: 'Feature',
    properties: {
        name: feature.properties && feature.properties.name,
        adcode: feature.properties && feature.properties.adcode
    },
    geometry: {
        type: feature.geometry.type,
        coordinates: simplifyCoordinates(feature.geometry.coordinates, tolerance)
    }
}));

const output = { type: 'FeatureCollection', features };
const json = JSON.stringify(output);
fs.writeFileSync(targetPath, json);

function countPoints(coordinates) {
    if (typeof coordinates[0] === 'number') return 1;
    return coordinates.reduce((total, part) => total + countPoints(part), 0);
}

const points = features.reduce((total, feature) => total + countPoints(feature.geometry.coordinates), 0);
const kb = value => `${(value / 1024).toFixed(1)} KB`;
console.log(`source : ${kb(fs.statSync(sourcePath).size)}`);
console.log(`output : ${kb(Buffer.byteLength(json))} (${targetPath})`);
console.log(`points : ${points.toLocaleString()} · tolerance ${tolerance}°`);
