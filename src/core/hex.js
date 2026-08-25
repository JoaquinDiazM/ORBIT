const SQRT_3 = Math.sqrt(3);

export const AXIAL_DIRECTIONS = Object.freeze([
  Object.freeze({ q: 1, r: 0, name: "east" }),
  Object.freeze({ q: 1, r: -1, name: "north-east" }),
  Object.freeze({ q: 0, r: -1, name: "north-west" }),
  Object.freeze({ q: -1, r: 0, name: "west" }),
  Object.freeze({ q: -1, r: 1, name: "south-west" }),
  Object.freeze({ q: 0, r: 1, name: "south-east" }),
]);

export function axialKey(q, r) {
  return `${q},${r}`;
}

export function axialToPixel(q, r, size) {
  return {
    x: size * SQRT_3 * (q + r / 2),
    y: size * 1.5 * r,
  };
}

export function pixelToAxial(x, y, size) {
  return {
    q: ((SQRT_3 / 3) * x - y / 3) / size,
    r: ((2 / 3) * y) / size,
  };
}

export function axialRound(q, r) {
  let cubeX = q;
  let cubeZ = r;
  let cubeY = -cubeX - cubeZ;

  let roundedX = Math.round(cubeX);
  let roundedY = Math.round(cubeY);
  let roundedZ = Math.round(cubeZ);

  const xDiff = Math.abs(roundedX - cubeX);
  const yDiff = Math.abs(roundedY - cubeY);
  const zDiff = Math.abs(roundedZ - cubeZ);

  if (xDiff > yDiff && xDiff > zDiff) {
    roundedX = -roundedY - roundedZ;
  } else if (yDiff > zDiff) {
    roundedY = -roundedX - roundedZ;
  } else {
    roundedZ = -roundedX - roundedY;
  }

  return {
    q: Object.is(roundedX, -0) ? 0 : roundedX,
    r: Object.is(roundedZ, -0) ? 0 : roundedZ,
  };
}

export function pixelToHex(x, y, size) {
  const fractional = pixelToAxial(x, y, size);
  return axialRound(fractional.q, fractional.r);
}

export function axialNeighbor(q, r, directionIndex) {
  const direction = AXIAL_DIRECTIONS[directionIndex];
  if (!direction) {
    throw new RangeError(`Dirección hexagonal inválida: ${directionIndex}`);
  }
  return { q: q + direction.q, r: r + direction.r };
}

export function axialNeighbors(q, r) {
  return AXIAL_DIRECTIONS.map((_, index) => axialNeighbor(q, r, index));
}

export function hexCorners(centerX, centerY, size) {
  const corners = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = ((-90 + 60 * index) * Math.PI) / 180;
    corners.push({
      x: centerX + size * Math.cos(angle),
      y: centerY + size * Math.sin(angle),
    });
  }
  return corners;
}

const EDGE_CORNER_INDICES = Object.freeze([
  Object.freeze([1, 2]),
  Object.freeze([0, 1]),
  Object.freeze([5, 0]),
  Object.freeze([4, 5]),
  Object.freeze([3, 4]),
  Object.freeze([2, 3]),
]);

export function hexEdge(centerX, centerY, size, directionIndex) {
  const cornerIndices = EDGE_CORNER_INDICES[directionIndex];
  if (!cornerIndices) {
    throw new RangeError(`Dirección de arista inválida: ${directionIndex}`);
  }
  const corners = hexCorners(centerX, centerY, size);
  return {
    start: corners[cornerIndices[0]],
    end: corners[cornerIndices[1]],
  };
}

export function pointInHex(x, y, centerX, centerY, size) {
  const localX = Math.abs(x - centerX);
  const localY = Math.abs(y - centerY);
  if (localY > size) return false;
  if (localX > (SQRT_3 * size) / 2) return false;
  return SQRT_3 * localY + localX <= SQRT_3 * size;
}

export function axialDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -a.q - a.r - (-b.q - b.r);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

export function getWorldBounds(areas, size, padding = 80) {
  if (areas.length === 0) {
    return { minX: -padding, maxX: padding, minY: -padding, maxY: padding };
  }

  const points = areas.flatMap((area) => {
    const center = axialToPixel(area.q, area.r, size);
    return hexCorners(center.x, center.y, size);
  });

  return {
    minX: Math.min(...points.map((point) => point.x)) - padding,
    maxX: Math.max(...points.map((point) => point.x)) + padding,
    minY: Math.min(...points.map((point) => point.y)) - padding,
    maxY: Math.max(...points.map((point) => point.y)) + padding,
  };
}
