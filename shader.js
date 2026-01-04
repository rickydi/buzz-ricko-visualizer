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

float fbm(vec2 p, float t) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p + t * 0.05);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime * uSpeed;

    // Style basé sur le temps
    float styleTime = t / 17.0;
    float styleId = floor(mod(styleTime, 30.0));
    float h = hash(styleId);

    // Rotation et symétrie
    float segments = 3.0 + floor(h * 5.0);
    float angle = atan(uv.y, uv.x) + t * (h - 0.5) * 0.2;
    float radius = length(uv);

    float segAngle = TAU / segments;
    float a = mod(angle, segAngle);
    a = abs(a - segAngle * 0.5);

    vec2 p = vec2(cos(a), sin(a)) * radius;

    // Déformation fluide
    float f1 = fbm(p * 2.0 + t * 0.1, t);
    float f2 = fbm(p * 1.5 - t * 0.08, t);
    p += vec2(f1, f2) * 0.5;

    // Pattern
    float val = fbm(p * (2.0 + h * 4.0), t * 0.2);
    val += sin(p.x * (3.0 + h * 5.0) + f1 * 3.0 + t * 0.3) * 0.2;
    val += sin(length(p) * (5.0 + h * 8.0) - t * 0.5) * 0.15;

    val = smoothstep(0.2, 0.8, val + 0.3);

    // Audio
    float bass = uBass * uSensitivity;
    float treble = uTreble * uSensitivity;
    val += bass * 0.2 * sin(t + length(p) * 3.0);

    // Couleurs
    vec3 c1 = vec3(0.5 + h * 0.3, 0.4 + hash(styleId + 1.0) * 0.3, 0.6);
    vec3 c2 = vec3(0.4, 0.5 + hash(styleId + 2.0) * 0.3, 0.4 + h * 0.4);
    vec3 c3 = vec3(1.0, 0.8, 0.6);
    vec3 c4 = vec3(0.1, 0.2, 0.4);

    vec3 col = pal(val + t * 0.05, c1, c2, c3, c4);

    // Fade aux bords
    col *= smoothstep(segAngle * 0.9, 0.0, a);

    // Vignette
    col *= smoothstep(2.0, 0.5, length(uv));

    // Boost avec bass
    col *= 0.8 + bass * 0.3;

    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
