const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uSensitivity;
uniform float uSpeed;

#define PI 3.14159265359
#define TAU 6.28318530718

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
}

// 30 STYLES UNIQUES
vec3 style0(vec2 uv, float t, float b, float tr) { // Plasma classique
    float v = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t * 1.1);
    v += sin((uv.x + uv.y) * 8.0 + t * 0.9) + sin(length(uv) * 12.0 - t);
    v = v * 0.25 + 0.5 + b * 0.3;
    return pal(v, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2));
}

vec3 style1(vec2 uv, float t, float b, float tr) { // Tunnel infini
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    float v = a / PI + 1.0 / r - t * 0.5;
    v += b * 0.5;
    return pal(v, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.2));
}

vec3 style2(vec2 uv, float t, float b, float tr) { // Cercles concentriques
    float r = length(uv);
    float v = sin(r * 20.0 - t * 3.0 - b * 5.0) * 0.5 + 0.5;
    v *= smoothstep(2.0, 0.0, r);
    return vec3(v * 0.2, v * 0.5 + tr * 0.3, v);
}

vec3 style3(vec2 uv, float t, float b, float tr) { // Damier déformé
    vec2 p = uv * 5.0 + vec2(sin(t), cos(t * 0.7)) * b;
    float v = mod(floor(p.x) + floor(p.y), 2.0);
    v = mix(v, 1.0 - v, sin(t) * 0.5 + 0.5);
    return vec3(v, v * 0.7, v * 0.3 + tr * 0.5);
}

vec3 style4(vec2 uv, float t, float b, float tr) { // Spirale hypnotique
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    float v = sin(a * 5.0 + r * 10.0 - t * 2.0 - b * 3.0);
    return vec3(v * 0.5 + 0.5, 0.3, 0.7 + tr * 0.3);
}

vec3 style5(vec2 uv, float t, float b, float tr) { // Feu
    vec2 p = uv * 3.0;
    p.y -= t * 2.0;
    float n = fbm(p) * fbm(p * 2.0 + t);
    n += b * 0.4;
    return vec3(n * 1.5, n * 0.5, n * 0.1);
}

vec3 style6(vec2 uv, float t, float b, float tr) { // Étoiles filantes
    vec2 p = uv * 10.0;
    p = fract(p) - 0.5;
    float d = length(p);
    float v = 0.02 / d;
    v *= sin(t * 5.0 + uv.x * 20.0) * 0.5 + 0.5;
    v += b * 0.3;
    return vec3(v, v * 0.8, v * 1.2);
}

vec3 style7(vec2 uv, float t, float b, float tr) { // Kaléidoscope 6
    float a = atan(uv.y, uv.x);
    a = mod(a, PI / 3.0);
    a = abs(a - PI / 6.0);
    vec2 p = vec2(cos(a), sin(a)) * length(uv);
    float v = fbm(p * 5.0 + t * 0.3);
    v += b * 0.3;
    return pal(v + t * 0.1, vec3(0.5), vec3(0.5), vec3(1.0, 0.5, 0.3), vec3(0.2, 0.0, 0.5));
}

vec3 style8(vec2 uv, float t, float b, float tr) { // Vagues océan
    float v = 0.0;
    for (float i = 1.0; i < 5.0; i++) {
        v += sin(uv.x * i * 3.0 + t * i * 0.5 + b) / i;
        v += sin(uv.y * i * 2.0 - t * i * 0.3) / i;
    }
    v = v * 0.3 + 0.5;
    return vec3(0.1, 0.3 + v * 0.4, 0.5 + v * 0.5);
}

vec3 style9(vec2 uv, float t, float b, float tr) { // Cellules
    vec2 p = uv * 4.0;
    vec2 i = floor(p);
    vec2 f = fract(p);
    float md = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 n = vec2(float(x), float(y));
            vec2 pt = hash21(i + n) * 0.5 + 0.25;
            pt += sin(t + hash21(i + n) * TAU) * 0.2 * (1.0 + b);
            md = min(md, length(n + pt - f));
        }
    }
    return vec3(md + tr * 0.3, md * 0.6, md * 0.9);
}

vec3 style10(vec2 uv, float t, float b, float tr) { // Matrix
    vec2 p = uv * vec2(15.0, 10.0);
    float col = floor(p.x);
    float v = fract(p.y + t * (hash(col) + 0.5) * 2.0);
    v = pow(v, 3.0) * step(0.7, hash(col + floor(t * 3.0)));
    v += b * 0.2;
    return vec3(0.0, v, 0.0);
}

vec3 style11(vec2 uv, float t, float b, float tr) { // Aurora borealis
    float v = 0.0;
    for (float i = 0.0; i < 4.0; i++) {
        float f = fbm(vec2(uv.x * 2.0 + i * 0.5, t * 0.2 + i));
        v += sin(uv.y * 5.0 + f * 3.0 + i + b) * 0.25;
    }
    v = v + 0.5;
    return vec3(0.1, v * 0.8, v * 0.5 + 0.3);
}

vec3 style12(vec2 uv, float t, float b, float tr) { // Hexagones
    vec2 p = uv * 5.0;
    p.x *= 1.1547;
    p.y += mod(floor(p.x), 2.0) * 0.5;
    p = fract(p) - 0.5;
    float d = max(abs(p.x), abs(p.y * 0.866 + p.x * 0.5));
    float v = smoothstep(0.4, 0.38, d);
    v *= sin(t + length(uv) * 5.0 - b * 3.0) * 0.5 + 0.5;
    return vec3(v * 0.9, v * 0.5, v * 0.8 + tr * 0.2);
}

vec3 style13(vec2 uv, float t, float b, float tr) { // Nébuleuse
    float n1 = fbm(uv * 2.0 + t * 0.1);
    float n2 = fbm(uv * 3.0 - t * 0.15 + 10.0);
    float n3 = fbm(uv * 4.0 + t * 0.05 + 20.0);
    vec3 c1 = vec3(0.8, 0.2, 0.5) * n1;
    vec3 c2 = vec3(0.2, 0.3, 0.9) * n2;
    vec3 c3 = vec3(0.9, 0.8, 0.3) * n3 * (b + 0.2);
    return (c1 + c2 + c3) * 0.7;
}

vec3 style14(vec2 uv, float t, float b, float tr) { // Laser grid
    vec2 p = abs(fract(uv * 5.0 + t * 0.2) - 0.5);
    float g = min(p.x, p.y);
    float v = smoothstep(0.05, 0.0, g);
    v += b * 0.3;
    return vec3(v * 0.3, v, v * 0.8);
}

vec3 style15(vec2 uv, float t, float b, float tr) { // Fractal simple
    vec2 z = uv * 2.0;
    float v = 0.0;
    for (int i = 0; i < 8; i++) {
        z = abs(z) / dot(z, z) - vec2(0.7 + sin(t * 0.3) * 0.2, 0.5 + b * 0.2);
        v += length(z);
    }
    v = v * 0.05;
    return pal(v, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
}

vec3 style16(vec2 uv, float t, float b, float tr) { // Gouttes de pluie
    vec2 p = uv * 10.0;
    vec2 id = floor(p);
    p = fract(p) - 0.5;
    float d = length(p);
    float ripple = sin(d * 20.0 - t * 5.0 - hash21(id) * TAU) * exp(-d * 3.0);
    ripple *= step(hash21(id + t * 0.1), 0.1 + b * 0.3);
    return vec3(0.2, 0.4, 0.8) + ripple * 0.5;
}

vec3 style17(vec2 uv, float t, float b, float tr) { // Lave
    float n = fbm(uv * 3.0 + t * 0.2);
    n = pow(n, 2.0);
    n += b * 0.3;
    return vec3(1.0, n * 0.6 + 0.2, n * 0.1);
}

vec3 style18(vec2 uv, float t, float b, float tr) { // Disco ball
    float a = atan(uv.y, uv.x) * 8.0 / PI;
    float r = length(uv) * 10.0;
    float v = sin(floor(a) + t * 3.0) * sin(floor(r) - t * 2.0);
    v = v * 0.5 + 0.5;
    v += b * 0.4;
    vec3 c = pal(floor(a) * 0.1 + floor(r) * 0.1, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
    return c * v;
}

vec3 style19(vec2 uv, float t, float b, float tr) { // Électricité
    vec2 p = uv * 2.0;
    float v = 0.0;
    for (float i = 0.0; i < 5.0; i++) {
        p.x += sin(p.y * 3.0 + t * 2.0 + i) * 0.3;
        v += 0.01 / abs(p.x + sin(p.y * 5.0 + t * 3.0 + i * 1.5) * 0.2);
    }
    v = min(v, 1.0) + b * 0.2;
    return vec3(0.5, 0.7, 1.0) * v;
}

vec3 style20(vec2 uv, float t, float b, float tr) { // Mandala
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    a = mod(a, PI / 4.0);
    a = abs(a - PI / 8.0);
    float v = sin(a * 20.0 + r * 15.0 - t * 2.0 - b * 4.0);
    v += sin(r * 30.0 - t * 3.0);
    v = v * 0.25 + 0.5;
    return pal(v + r * 0.5, vec3(0.5), vec3(0.5), vec3(1.0, 0.5, 0.0), vec3(0.5, 0.2, 0.0));
}

vec3 style21(vec2 uv, float t, float b, float tr) { // Glitch
    vec2 p = uv;
    float glitch = step(0.95, hash(floor(t * 10.0)));
    p.x += glitch * (hash(floor(p.y * 20.0 + t)) - 0.5) * 0.3;
    float v = step(0.5, fract(p.x * 10.0 + t));
    v = mix(v, 1.0 - v, step(0.9, hash(floor(p.y * 5.0) + floor(t * 5.0))));
    return vec3(v + b * 0.2, v * 0.3, v * 0.8 + tr * 0.3);
}

vec3 style22(vec2 uv, float t, float b, float tr) { // Bulles
    vec3 col = vec3(0.1, 0.1, 0.3);
    for (float i = 0.0; i < 10.0; i++) {
        vec2 center = vec2(sin(i * 1.3 + t * 0.5), cos(i * 1.7 + t * 0.4)) * 0.7;
        float r = 0.1 + hash(i) * 0.15;
        float d = length(uv - center);
        float bubble = smoothstep(r, r - 0.02, d) - smoothstep(r - 0.02, r - 0.05, d);
        bubble += smoothstep(r, r - 0.01, d) * 0.3;
        col += vec3(0.3, 0.6, 0.9) * bubble * (1.0 + b * 0.5);
    }
    return col;
}

vec3 style23(vec2 uv, float t, float b, float tr) { // Triangles
    vec2 p = uv * 6.0;
    p.x += mod(floor(p.y), 2.0) * 0.5;
    vec2 f = fract(p) - 0.5;
    float d = abs(f.x) + abs(f.y);
    float v = smoothstep(0.5, 0.48, d);
    v *= sin(floor(p.x) + floor(p.y) + t * 2.0) * 0.5 + 0.5;
    v += b * 0.3;
    return vec3(v * 0.9, v * 0.4, v * 0.7);
}

vec3 style24(vec2 uv, float t, float b, float tr) { // Stroboscope
    float v = sin(t * 15.0 + length(uv) * 10.0) * 0.5 + 0.5;
    v = step(0.3, v);
    v *= (1.0 + b);
    vec3 c = pal(t * 0.5, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
    return c * v;
}

vec3 style25(vec2 uv, float t, float b, float tr) { // Gradient tournant
    float a = atan(uv.y, uv.x) + t * 0.5;
    float r = length(uv);
    float v = sin(a * 3.0) * 0.5 + 0.5;
    v = mix(v, 1.0 - v, sin(r * 5.0 - t * 2.0 + b * 3.0) * 0.5 + 0.5);
    return pal(v + t * 0.1, vec3(0.8, 0.5, 0.4), vec3(0.2, 0.4, 0.2), vec3(1.0), vec3(0.0, 0.25, 0.25));
}

vec3 style26(vec2 uv, float t, float b, float tr) { // Fumée
    vec2 p = uv * 2.0;
    p.y += t * 0.5;
    float n = fbm(p + fbm(p + fbm(p)));
    n += b * 0.2;
    return vec3(n * 0.8, n * 0.85, n * 0.9);
}

vec3 style27(vec2 uv, float t, float b, float tr) { // Pixels rétro
    vec2 p = floor(uv * 20.0) / 20.0;
    float v = hash21(p + floor(t * 2.0) * 0.01);
    v = step(0.5 - b * 0.3, v);
    vec3 c = vec3(hash21(p), hash21(p + 1.0), hash21(p + 2.0));
    return c * v;
}

vec3 style28(vec2 uv, float t, float b, float tr) { // Wormhole
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    float spiral = a + r * 5.0 - t * 2.0 - b * 2.0;
    float v = sin(spiral * 3.0) * 0.5 + 0.5;
    v *= exp(-r * 0.5);
    return vec3(v * 0.3, v * 0.2, v + tr * 0.3);
}

vec3 style29(vec2 uv, float t, float b, float tr) { // Cosmic rays
    float v = 0.0;
    for (float i = 0.0; i < 8.0; i++) {
        float a = i * TAU / 8.0 + t * 0.3;
        vec2 dir = vec2(cos(a), sin(a));
        float d = abs(dot(uv, dir));
        v += 0.01 / (d + 0.01) * (sin(t * 3.0 + i) * 0.5 + 0.5);
    }
    v = min(v, 1.0) * (1.0 + b * 0.5);
    return vec3(v, v * 0.5, v * 0.8);
}

vec3 getStyle(vec2 uv, float t, float styleId, float bass, float treble) {
    int id = int(mod(styleId, 30.0));

    if (id == 0) return style0(uv, t, bass, treble);
    if (id == 1) return style1(uv, t, bass, treble);
    if (id == 2) return style2(uv, t, bass, treble);
    if (id == 3) return style3(uv, t, bass, treble);
    if (id == 4) return style4(uv, t, bass, treble);
    if (id == 5) return style5(uv, t, bass, treble);
    if (id == 6) return style6(uv, t, bass, treble);
    if (id == 7) return style7(uv, t, bass, treble);
    if (id == 8) return style8(uv, t, bass, treble);
    if (id == 9) return style9(uv, t, bass, treble);
    if (id == 10) return style10(uv, t, bass, treble);
    if (id == 11) return style11(uv, t, bass, treble);
    if (id == 12) return style12(uv, t, bass, treble);
    if (id == 13) return style13(uv, t, bass, treble);
    if (id == 14) return style14(uv, t, bass, treble);
    if (id == 15) return style15(uv, t, bass, treble);
    if (id == 16) return style16(uv, t, bass, treble);
    if (id == 17) return style17(uv, t, bass, treble);
    if (id == 18) return style18(uv, t, bass, treble);
    if (id == 19) return style19(uv, t, bass, treble);
    if (id == 20) return style20(uv, t, bass, treble);
    if (id == 21) return style21(uv, t, bass, treble);
    if (id == 22) return style22(uv, t, bass, treble);
    if (id == 23) return style23(uv, t, bass, treble);
    if (id == 24) return style24(uv, t, bass, treble);
    if (id == 25) return style25(uv, t, bass, treble);
    if (id == 26) return style26(uv, t, bass, treble);
    if (id == 27) return style27(uv, t, bass, treble);
    if (id == 28) return style28(uv, t, bass, treble);
    return style29(uv, t, bass, treble);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime * uSpeed;

    float bass = uBass * uSensitivity;
    float treble = uTreble * uSensitivity;

    float duration = 12.0;
    float transitionTime = 3.0;
    float cycle = duration + transitionTime;

    float timeInCycle = mod(t, cycle);
    float styleId = floor(mod(t / cycle, 30.0));
    float nextStyleId = mod(styleId + 1.0, 30.0);

    vec3 col;

    if (timeInCycle < duration) {
        col = getStyle(uv, t, styleId, bass, treble);
    } else {
        float tr = (timeInCycle - duration) / transitionTime;
        tr = smoothstep(0.0, 1.0, tr);

        vec2 uv1 = uv * (1.0 + tr * 0.3);
        uv1 *= rot(tr * 0.5);
        vec3 c1 = getStyle(uv1, t, styleId, bass, treble) * (1.0 - tr * 0.3);

        vec2 uv2 = uv * (1.3 - tr * 0.3);
        uv2 *= rot(-tr * 0.3);
        vec3 c2 = getStyle(uv2, t, nextStyleId, bass, treble);

        col = mix(c1, c2, tr);
    }

    col *= smoothstep(2.0, 0.5, length(uv));
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
