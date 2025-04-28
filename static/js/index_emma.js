
$(document).ready(function() {
  const options = {
    slidesToScroll: 1,
    slidesToShow: 1,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  };
  const carousels = bulmaCarousel.attach('.carousel', options);
});

document.addEventListener('DOMContentLoaded', function() {
  loadTableData();
  setupEventListeners();
  window.addEventListener('resize', adjustNameColumnWidth);
});


function loadTableData() {
  console.log('Starting to load table data...');
  fetch('./emma_leaderboard.json') 
    .then(response => {
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Data loaded successfully:', data);
      const tbody = document.querySelector('#emma-table tbody');


      const emmaScores = prepareScoresForStyling(data.leaderboardData, 'emma');
      const emmaMiniScores = prepareScoresForStyling(data.leaderboardData, 'emma-mini');

      data.leaderboardData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.classList.add(row.info.type || 'unknown');

        const nameCell = (row.info.link && row.info.link.trim() !== '')
          ? `<a href="${row.info.link}" target="_blank"><b>${row.info.name}</b></a>`
          : `<b>${row.info.name}</b>`;


        let cotSymbol = '-';
        if (row.info.CoT === "true") {
          cotSymbol = '✓';
        } else if (row.info.CoT === "false") {
          cotSymbol = '✗';
        }


        const safeGet = (obj, path, defaultValue = '-') => {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;
        };


        const formatOverallValue = (value, source) => {

          return (source === 'author') ? `${value || '-'}*` : `${value || '-'}`;
        };


        const emmaOverall = formatOverallValue(
          applyStyle(safeGet(row, 'emma.overall'), emmaScores.overall[index]),
          safeGet(row, 'emma.source')
        );

        const emmaMiniOverall = formatOverallValue(
          applyStyle(safeGet(row, 'emma-mini.overall'), emmaMiniScores.overall[index]),
          safeGet(row, 'emma-mini.source')
        );


        tr.innerHTML = `
          <td>${nameCell}</td>
          <td>${row.info.size || '-'}</td>
          <td>${cotSymbol}</td>

          <!-- EMMA -->
          <td class="emma-overall">${emmaOverall}</td>
          <td class="hidden emma-details">${applyStyle(safeGet(row, 'emma.math'), emmaScores.math[index])}</td>
          <td class="hidden emma-details">${applyStyle(safeGet(row, 'emma.physics'), emmaScores.physics[index])}</td>
          <td class="hidden emma-details">${applyStyle(safeGet(row, 'emma.chemistry'), emmaScores.chemistry[index])}</td>
          <td class="hidden emma-details">${applyStyle(safeGet(row, 'emma.coding'), emmaScores.coding[index])}</td>

          <!-- EMMA-Mini -->
          <td class="emma-mini-overall">${emmaMiniOverall}</td>
          <td class="hidden emma-mini-details">${applyStyle(safeGet(row, 'emma-mini.math'), emmaMiniScores.math[index])}</td>
          <td class="hidden emma-mini-details">${applyStyle(safeGet(row, 'emma-mini.physics'), emmaMiniScores.physics[index])}</td>
          <td class="hidden emma-mini-details">${applyStyle(safeGet(row, 'emma-mini.chemistry'), emmaMiniScores.chemistry[index])}</td>
          <td class="hidden emma-mini-details">${applyStyle(safeGet(row, 'emma-mini.coding'), emmaMiniScores.coding[index])}</td>
        `;
        tbody.appendChild(tr);
      });

      setTimeout(adjustNameColumnWidth, 0);
      initializeSorting();
    })
    .catch(error => {
      console.error('Error loading table data:', error);
      document.querySelector('#emma-table tbody').innerHTML = `
        <tr>
          <td colspan="10">
            Error loading data: ${error.message}<br>
            Please ensure you're accessing this page through a web server
            (e.g., http://localhost:8000) and not directly from the file system.
          </td>
        </tr>
      `;
    });
}



function setupEventListeners() {
  // Reset
  document.querySelector('.reset-cell').addEventListener('click', function() {
    resetTable();
  });


  document.querySelector('.emma-details-cell').addEventListener('click', function() {
    toggleDetails('emma');
  });


  document.querySelector('.emma-mini-details-cell').addEventListener('click', function() {
    toggleDetails('emma-mini');
  });


  const headers = document.querySelectorAll('#emma-table thead tr:last-child th.sortable');
  headers.forEach(header => {
    header.addEventListener('click', function() {
      sortTable(this);
    });
  });
}


function toggleDetails(section) {
  const sections = ['emma', 'emma-mini'];
  sections.forEach(sec => {
    const detailCells = document.querySelectorAll('.' + sec + '-details');
    const overallCells = document.querySelectorAll('.' + sec + '-overall');
    const headerCell = document.querySelector('.' + sec + '-details-cell');
    if (sec === section) {
      detailCells.forEach(cell => cell.classList.toggle('hidden'));
      const currentColspan = headerCell.getAttribute('colspan');

      headerCell.setAttribute('colspan', currentColspan === '1' ? '5' : '1');
    } else {

      detailCells.forEach(cell => cell.classList.add('hidden'));
      overallCells.forEach(cell => cell.classList.remove('hidden'));
      document.querySelector('.' + sec + '-details-cell').setAttribute('colspan', '1');
    }
  });

  setTimeout(adjustNameColumnWidth, 0);
}


function resetTable() {

  document.querySelectorAll('.emma-details, .emma-mini-details').forEach(function(cell) {
    cell.classList.add('hidden');
  });


  document.querySelectorAll('.emma-overall, .emma-mini-overall').forEach(function(cell) {
    cell.classList.remove('hidden');
  });


  document.querySelector('.emma-details-cell').setAttribute('colspan', '1');
  document.querySelector('.emma-mini-details-cell').setAttribute('colspan', '1');


  const emmaMiniOverallHeader = document.querySelector('#emma-table thead tr:last-child th.emma-mini-overall');
  sortTable(emmaMiniOverallHeader, true);

  setTimeout(adjustNameColumnWidth, 0);
}


function sortTable(header, forceDescending = false, maintainOrder = false) {
  const table = document.getElementById('emma-table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const headers = Array.from(header.parentNode.children);
  const columnIndex = headers.indexOf(header);
  const sortType = header.dataset.sort;


  const isDescending = forceDescending ||
    (!header.classList.contains('asc') && !header.classList.contains('desc')) ||
    header.classList.contains('asc');

  if (!maintainOrder) {
    rows.sort((a, b) => {
      let aValue = getCellValue(a, columnIndex);
      let bValue = getCellValue(b, columnIndex);


      if (sortType === 'cot') {

        const cotMapping = {
          '✓': 2,
          '✗': 1,
          '-': 0
        };
        aValue = cotMapping[aValue] !== undefined ? cotMapping[aValue] : 0;
        bValue = cotMapping[bValue] !== undefined ? cotMapping[bValue] : 0;
        return isDescending ? (bValue - aValue) : (aValue - bValue);
      }


      if (aValue === '-' && bValue !== '-') return isDescending ? 1 : -1;
      if (bValue === '-' && aValue !== '-') return isDescending ? -1 : 1;


      if (sortType === 'number') {
        return isDescending
          ? parseFloat(bValue) - parseFloat(aValue)
          : parseFloat(aValue) - parseFloat(bValue);
      } else if (sortType === 'date') {
        return isDescending
          ? new Date(bValue) - new Date(aValue)
          : new Date(aValue) - new Date(bValue);
      } else {

        return isDescending
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
    });
  }


  headers.forEach(th => th.classList.remove('asc', 'desc'));

  header.classList.add(isDescending ? 'desc' : 'asc');


  rows.forEach(row => tbody.appendChild(row));

  setTimeout(adjustNameColumnWidth, 0);
}


function getCellValue(row, index) {
  const cells = Array.from(row.children);
  let cell = cells[index];


  if (cell && cell.classList.contains('hidden')) {
    if (cell.classList.contains('emma-details') || cell.classList.contains('emma-overall')) {
      cell = cells.find(c =>
        (c.classList.contains('emma-overall') || c.classList.contains('emma-details')) &&
        !c.classList.contains('hidden')
      );
    } else if (cell.classList.contains('emma-mini-details') || cell.classList.contains('emma-mini-overall')) {
      cell = cells.find(c =>
        (c.classList.contains('emma-mini-overall') || c.classList.contains('emma-mini-details')) &&
        !c.classList.contains('hidden')
      );
    }
  }
  return cell ? cell.textContent.trim() : '';
}


function initializeSorting() {
  const emmaMiniOverallHeader = document.querySelector('#emma-table thead tr:last-child th.emma-mini-overall');
  sortTable(emmaMiniOverallHeader, true);
}


function adjustNameColumnWidth() {
  const nameColumn = document.querySelectorAll('#emma-table td:first-child, #emma-table th:first-child');
  let maxWidth = 0;


  const span = document.createElement('span');
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'nowrap';
  document.body.appendChild(span);

  nameColumn.forEach(cell => {
    span.textContent = cell.textContent;
    const width = span.offsetWidth;
    if (width > maxWidth) {
      maxWidth = width;
    }
  });

  document.body.removeChild(span);


  maxWidth += 20;


  nameColumn.forEach(cell => {
    cell.style.width = `${maxWidth}px`;
    cell.style.minWidth = `${maxWidth}px`;
    cell.style.maxWidth = `${maxWidth}px`;
  });
}


function prepareScoresForStyling(data, section) {
  const scores = {};

  const fields = ['overall', 'math', 'physics', 'chemistry', 'coding'];

  fields.forEach(field => {
    const values = data
      .map(row => row[section] && row[section][field])
      .filter(value => value !== '-' && value !== undefined && value !== null)
      .map(parseFloat);

    if (values.length > 0) {

      const sortedValues = [...new Set(values)].sort((a, b) => b - a);
      scores[field] = data.map(row => {
        const value = row[section] && row[section][field];
        if (value === '-' || value === undefined || value === null) {
          return -1;
        }
        return sortedValues.indexOf(parseFloat(value));
      });
    } else {
      scores[field] = data.map(() => -1);
    }
  });

  return scores;
}


function applyStyle(value, rank) {
  if (value === undefined || value === null || value === '-') return '-';
  if (rank === 0) return `<b>${value}</b>`;
  if (rank === 1) return `<span style="text-decoration: underline;">${value}</span>`;
  return `${value}`;
}


document.addEventListener('DOMContentLoaded', () => {
  const interactiveData = [
    // {
    //   id: 1,
    //   pid: 'math_240',
    //   text: 'All vehicles in the garage can only drive forwards or backwards. The black car wants to leave the garage (see diagram). What is the minimum number of grey vehicles that need to move at least a little bit so that this is possible?',
    //   answer:'8',
    //   questionImage: './static/images/math_240_question.jpg',
    //   sketchImage: './static/images/math_240_human.png',
    //   models: {
    //     o3: "We regard the 3\u00a0\u00d7\u00a03 board as a set of 9 squares on which the dihedral group  \nD\u2084 (the 8 rotations\u00a0/\u00a0reflections of a square) acts.  \nFor two shaded squares, we need the number of orbits of 2\u2011element subsets under this action.  \nBurnside\u2019s Lemma gives  \n\n#(orbits)= (1/|G|)\u00a0\u03a3_{g\u2208G}\u00a0Fix(g),\n\nwhere Fix(g) is the number of 2\u2011square sets left unchanged by symmetry g.\n\n1. Identity (e): every C(9,2)=36 pair is fixed.\u2003Fix(e)=36\n\n2. Rotations 90\u00b0 and 270\u00b0: a 4\u2011cycle+4\u2011cycle+center.  \nNo 2\u2011subset can consist of whole cycles \u2192 Fix=0 each.\u2003Total 0+0=0\n\n3. Rotation 180\u00b0: center fixed, four 2\u2011cycles.  \nA 2\u2011subset can only be one whole 2\u2011cycle \u2192 4 ways.\u2003Fix=4\n\n4. Four reflections (horizontal, vertical, two diagonals):  \neach has 3 fixed points and three 2\u2011cycles.  \nA 2\u2011subset can be\n   \u2022 any C(3,2)=3 pairs of fixed points, or  \n   \u2022 any one of the 3 whole 2\u2011cycles.  \nHence Fix=3+3=6 for each reflection.\u2002With 4 reflections: 4\u00b76=24.\n\nAdd them: 36+0+4+24 = 64.\n\n|G| = 8, so\n#(orbits)=64/8 = 8.\n\n\\boxed{8}",
    //     o2: 'Model o2 对应的内容…',
    //     o4: 'Model o4 对应的内容…',
    //     o1: 'Model o1 对应的内容…'
    //   }
    // },
    {
      id: 1,
      pid: 'math_83',
      text: '	Each of these two pieces of wire is made of 8 segments of length 1. One of the pieces is placed one above the other so that they coincide partially. What is the largest possible length of their common part?',
      answer:'5',
      questionImage: './static/images/math_83_question.jpg',
      sketchImage: './static/images/math_83_human.png',
      models: { 
        o3: 'Step 1 – Put both wires on a square lattice\n' +
        'Mark the bottom end of the first wire as the origin and follow the bends exactly as in the picture:\n\n' +
        'Wire A\n' +
        '(0,0)→(0,1)→(0,2)→(0,3)→(1,3)→(1,4)→(2,4)→(3,4)→(4,4)\n\n' +
        'Wire B\n' +
        '(0,0)→(0,1)→(0,2)→(0,3)→(0,4)→(1,4)→(1,3)→(2,3)→(3,3)\n\n' +
        'Step 2 – List all unit-length segments\n' +
        'A (vertical): V A₁(0,0→1), V A₂(0,1→2), V A₃(0,2→3), V A₄(1,3→4)\n' +
        'A (horizontal): H A₁(0→1,3), H A₂(1→2,4), H A₃(2→3,4), H A₄(3→4,4)\n\n' +
        'B (vertical): V B₁(0,0→1), V B₂(0,1→2), V B₃(0,2→3), V B₄(0,3→4), V B₅(1,3→4)\n' +
        'B (horizontal): H B₁(0→1,4), H B₂(1→2,3), H B₃(2→3,3)\n\n' +
        'Step 3 – Look for a translation that maximises coincidence\n' +
        'Translate wire B by (0,0) — keep both drawings as they stand.\n\n' +
        '• Vertical coincidences: V A₁…V A₄ coincide with V B₁…V B₅ → total 4\n' +
        '• Horizontal coincidences: none\n\n' +
        'Step 4 – Show that 4 is maximal\n' +
        'Any other translation loses at least one vertical overlap when gaining a horizontal one.\n' +
        'Hence no rigid motion can exceed **4**.\n\n' +
        '\\boxed{4}',
        Genimi_2_5_pro: "*   **Step 1: Represent the wire shapes**\n    Let's represent the two wire shapes using coordinates on a grid. Each segment has length 1.\n\n    Shape A (the left one):\n    We can define the points starting from the bottom-left end. Let the point be (0,0).\n    Points: (0,1), (0,0), (1,0), (1,1), (2,1), (2,2), (3,2), (3,3), (4,3)\n    Segments (vectors):\n    A1: (0,1) -> (0,0) [Vertical, V]\n    A2: (0,0) -> (1,0) [Horizontal, H]\n    A3: (1,0) -> (1,1) [V]\n    A4: (1,1) -> (2,1) [H]\n    A5: (2,1) -> (2,2) [V]\n    A6: (2,2) -> (3,2) [H]\n    A7: (3,2) -> (3,3) [V]\n    A8: (3,3) -> (4,3) [H]\n\n    Shape B (the right one):\n    Let's define the points starting from the top-left end. Let the point be (0,0).\n    Points: (0,0), (0,-1), (0,-2), (1,-2), (2,-2), (2,-1), (3,-1), (3,0), (3,1)\n    Alternatively, let the \"corner\" point (the 4th point from the top) be (0,0).\n    Points: (-2,2), (-2,1), (-2,0), (-1,0), (0,0), (0,-1), (1,-1), (1,-2), (1,-3)\n    Segments (vectors):\n    B1: (-2,2) -> (-2,1) [V]\n    B2: (-2,1) -> (-2,0) [V]\n    B3: (-2,0) -> (-1,0) [H]\n    B4: (-1,0) -> (0,0) [H]\n    B5: (0,0) -> (0,-1) [V]\n    B6: (0,-1) -> (1,-1) [H]\n    B7: (1,-1) -> (1,-2) [V]\n    B8: (1,-2) -> (1,-3) [V]\n\n*   **Step 2: Explore transformations of Shape B to maximize overlap with Shape A**\n    We can translate, rotate, and reflect Shape B and place it on top of Shape A. The goal is to maximize the total length of the segments that coincide.\n\n*   **Step 3: Consider reflection and translation**\n    Let's reflect Shape B across the x-axis. The reference point (0,0) stays the same.\n    Reflected points: (-2,-2), (-2,-1), (-2,0), (-1,0), (0,0), (0,1), (1,1), (1,2), (1,3)\n    Reflected Segments (B'):\n    B1': [(-2,-2),(-2,-1)] V\n    B2': [(-2,-1),(-2,0)] V\n    B3': [(-2,0),(-1,0)] H\n    B4': [(-1,0),(0,0)] H\n    B5': [(0,0),(0,1)] V\n    B6': [(0,1),(1,1)] H\n    B7': [(1,1),(1,2)] V\n    B8': [(1,2),(1,3)] V\n\n    Now, let's translate this reflected shape B' so that its reference point (0,0) moves to (2,1) in Shape A's coordinate system. This corresponds to a shift by the vector (2,1).\n    Shifted Segments (B''):\n    B1'': [(0,-1),(0,0)] V\n    B2'': [(0,0),(0,1)] V\n    B3'': [(0,1),(1,1)] H\n    B4'': [(1,1),(2,1)] H\n    B5'': [(2,1),(2,2)] V\n    B6'': [(2,2),(3,2)] H\n    B7'': [(3,2),(3,3)] V\n    B8'': [(3,3),(3,4)] V\n\n*   **Step 4: Identify the overlapping segments**\n    Compare the segments of Shape A with the segments of the transformed Shape B (B'').\n    Shape A segments:\n    A1: [(0,1), (0,0)] V\n    A2: [(0,0), (1,0)] H\n    A3: [(1,0), (1,1)] V\n    A4: [(1,1), (2,1)] H\n    A5: [(2,1), (2,2)] V\n    A6: [(2,2), (3,2)] H\n    A7: [(3,2), (3,3)] V\n    A8: [(3,3), (4,3)] H\n\n    Shape B'' segments:\n    B1'': [(0,-1),(0,0)] V\n    B2'': [(0,0),(0,1)] V\n    B3'': [(0,1),(1,1)] H\n    B4'': [(1,1),(2,1)] H\n    B5'': [(2,1),(2,2)] V\n    B6'': [(2,2),(3,2)] H\n    B7'': [(3,2),(3,3)] V\n    B8'': [(3,3),(3,4)] V\n\n    Overlapping segments:\n    - A1 [(0,1), (0,0)] overlaps with B2'' [(0,0),(0,1)] (same segment, opposite direction). Length = 1.\n    - A4 [(1,1), (2,1)] overlaps with B4'' [(1,1),(2,1)]. Length = 1.\n    - A5 [(2,1), (2,2)] overlaps with B5'' [(2,1),(2,2)]. Length = 1.\n    - A6 [(2,2), (3,2)] overlaps with B6'' [(2,2),(3,2)]. Length = 1.\n    - A7 [(3,2), (3,3)] overlaps with B7'' [(3,2),(3,3)]. Length = 1.\n\n*   **Step 5: Calculate the total length of the common part**\n    The total length of the overlapping segments is 1 + 1 + 1 + 1 + 1 = 5.\n\n*   **Step 6: Verify if a larger overlap is possible**\n    We explored other transformations (translations, rotations, other reflections) in the thought process and found overlaps of length 1, 2, 3, and 4. The configuration found in Step 4 yields an overlap of 5. It appears to be the maximum possible overlap.\n\nThe largest possible length of their common part is 5.\n\nFinal Answer: The final answer is $\\boxed{5}$",
        // o2: '…', o4: '…'
      }
    },
    {
      id: 2,
      pid: 'math_580',
      text: "A river goes through a city and there are two islands. There are also six bridges how it is shown in the attached image. How many paths there are going out of a shore of the river (point $A$ ) and come back (to point $B$ ) after having spent one and only one time for each bridge?\n<image_1>",
      answer:'6',
      questionImage: './static/images/math_580_question.jpg',
      sketchImage: './static/images/math_580_human.png',
      models: { 
        o3: "Step\u00a01.  Model the situation by a graph  \n\u2011\u00a0Vertices (land masses):  \n\u2003N\u2003= the whole northern bank (points A and B lie on it),  \n\u2003S\u2003= the whole southern bank,  \n\u2003L\u2003= the left island,  \n\u2003R\u2003= the right island.  \n\n\u2011\u00a0Edges (bridges):  \n\u20031 : N\u2013L\u2003\u2003\u2003\u2003\u2003\u2003\u20035 : N\u2013R  \n\u20032 : S\u2013L\u2003\u2003\u2003\u2003\u2003\u2003\u20036 : S\u2013R  \n\u20033 : L\u2013R\u2003\u2003\u2003\u2003\u2003\u2003\u20034 : L\u2013R  \n\nStep\u00a02.  Check Euler conditions  \ndeg\u00a0(N)=2,\u00a0deg\u00a0(S)=2,\u00a0deg\u00a0(L)=4,\u00a0deg\u00a0(R)=4 \u2003\u2003\u2192 every vertex has even degree.  \nHence an Eulerian tour (a walk that uses every edge exactly once and comes back to the starting bank) exists.\n\nStep\u00a03.  Fix the start and finish  \nWe must start on the northern bank at A and end on the northern bank at B.  \nTherefore the first bridge crossed must be 1 or 5 and the last bridge crossed must be the other one.\n\nStep\u00a04.  Count the tours  \n\nA. First 1, last 5  \nAfter 1 (N\u2192L) the remaining edges are {2,3,4,6}; after the last return 5 (R\u2192N).  \nA short case\u2011by\u2011case check gives the six admissible orders:  \n1\u20112\u20116\u20113\u20114\u20115  \n1\u20112\u20116\u20114\u20113\u20115  \n1\u20113\u20116\u20112\u20114\u20115  \n1\u20113\u20114\u20112\u20116\u20115  \n1\u20114\u20116\u20112\u20113\u20115  \n1\u20114\u20113\u20112\u20116\u20115\n\nB. First 5, last 1  \nBy symmetry (interchanging the two islands and the two N\u2011bridges) we obtain another six tours.\n\nTotal number of Eulerian tours starting at A and ending at B:\n6\u00a0+\u00a06\u00a0=\u00a012.\n\n\\boxed{12}",
        Genimi_2_5_pro:"1.  **Model the problem as a graph:**\n    *   Let the landmasses be the vertices (nodes) of the graph. We have four landmasses:\n        *   $S_1$: The shore where points A and B are located (top shore).\n        *   $S_2$: The other shore (bottom shore).\n        *   $I_1$: The left island.\n        *   $I_2$: The right island.\n    *   Let the bridges be the edges of the graph. We have six bridges:\n        *   Bridge 1: Connects $S_1$ and $I_1$.\n        *   Bridge 2: Connects $S_2$ and $I_1$.\n        *   Bridge 3: Connects $I_1$ and $I_2$.\n        *   Bridge 4: Connects $I_1$ and $I_2$. (Note: Bridges 3 and 4 are parallel edges).\n        *   Bridge 5: Connects $S_1$ and $I_2$.\n        *   Bridge 6: Connects $S_2$ and $I_2$.\n\n2.  **Identify the problem type:**\n    *   The problem asks for the number of paths that start at shore $S_1$ (point A), end at shore $S_1$ (point B), and traverse each bridge (edge) exactly once.\n    *   This is equivalent to finding the number of Eulerian circuits in the graph that start and end at vertex $S_1$.\n\n3.  **Check for the existence of Eulerian circuits:**\n    *   An Eulerian circuit exists if and only if the graph is connected and every vertex has an even degree (number of edges connected to it).\n    *   Calculate the degree of each vertex:\n        *   Degree($S_1$) = 2 (connected by bridges 1 and 5).\n        *   Degree($S_2$) = 2 (connected by bridges 2 and 6).\n        *   Degree($I_1$) = 4 (connected by bridges 1, 2, 3, and 4).\n        *   Degree($I_2$) = 4 (connected by bridges 3, 4, 5, and 6).\n    *   All vertices have even degrees, and the graph is connected. Therefore, Eulerian circuits exist.\n\n4.  **Enumerate the Eulerian circuits starting and ending at $S_1$:**\n    *   An Eulerian circuit starting at $S_1$ must begin with either bridge 1 or bridge 5. Since Degree($S_1$) = 2, if it starts with one of these bridges, it must end with the other.\n\n    *   **Case 1: Start with bridge 1, end with bridge 5.**\n        The path starts $S_1 \\xrightarrow{1} I_1$. The path must end $... \\rightarrow I_2 \\xrightarrow{5} S_1$.\n        The middle part must be a path from $I_1$ to $I_2$ using the remaining bridges {2, 3, 4, 6}.\n        We must traverse bridges 2 and 6. Since Degree($S_2$) = 2, these must be traversed consecutively, either as $I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2$ or $I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1$.\n        Let's list the possible sequences for the middle part {2, 3, 4, 6} from $I_1$ to $I_2$:\n        a) Use $I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2$ first, then traverse between $I_1, I_2$ using {3, 4}.\n           - $I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2 \\xrightarrow{3} I_1 \\xrightarrow{4} I_2$. Sequence: 2-6-3-4. Full path: 1-2-6-3-4-5.\n           - $I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2 \\xrightarrow{4} I_1 \\xrightarrow{3} I_2$. Sequence: 2-6-4-3. Full path: 1-2-6-4-3-5.\n        b) Traverse between $I_1, I_2$ using {3, 4} first, then use $I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2$.\n           - $I_1 \\xrightarrow{3} I_2 \\xrightarrow{4} I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2$. Sequence: 3-4-2-6. Full path: 1-3-4-2-6-5.\n           - $I_1 \\xrightarrow{4} I_2 \\xrightarrow{3} I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2$. Sequence: 4-3-2-6. Full path: 1-4-3-2-6-5.\n        c) Use $I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1$ in the middle.\n           - $I_1 \\xrightarrow{3} I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1 \\xrightarrow{4} I_2$. Sequence: 3-6-2-4. Full path: 1-3-6-2-4-5.\n           - $I_1 \\xrightarrow{4} I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1 \\xrightarrow{3} I_2$. Sequence: 4-6-2-3. Full path: 1-4-6-2-3-5.\n        There are 6 paths starting with bridge 1.\n\n    *   **Case 2: Start with bridge 5, end with bridge 1.**\n        The path starts $S_1 \\xrightarrow{5} I_2$. The path must end $... \\rightarrow I_1 \\xrightarrow{1} S_1$.\n        The middle part must be a path from $I_2$ to $I_1$ using the remaining bridges {2, 3, 4, 6}.\n        By symmetry with Case 1 (swapping $I_1 \\leftrightarrow I_2$, $1 \\leftrightarrow 5$, $2 \\leftrightarrow 6$), there must also be 6 paths in this case. Let's list them for completeness:\n        a) Use $I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1$ first, then traverse between $I_1, I_2$ using {3, 4}.\n           - $I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1 \\xrightarrow{3} I_2 \\xrightarrow{4} I_1$. Sequence: 6-2-3-4. Full path: 5-6-2-3-4-1.\n           - $I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1 \\xrightarrow{4} I_2 \\xrightarrow{3} I_1$. Sequence: 6-2-4-3. Full path: 5-6-2-4-3-1.\n        b) Traverse between $I_1, I_2$ using {3, 4} first, then use $I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1$.\n           - $I_2 \\xrightarrow{3} I_1 \\xrightarrow{4} I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1$. Sequence: 3-4-6-2. Full path: 5-3-4-6-2-1.\n           - $I_2 \\xrightarrow{4} I_1 \\xrightarrow{3} I_2 \\xrightarrow{6} S_2 \\xrightarrow{2} I_1$. Sequence: 4-3-6-2. Full path: 5-4-3-6-2-1.\n        c) Use $I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2$ in the middle.\n           - $I_2 \\xrightarrow{3} I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2 \\xrightarrow{4} I_1$. Sequence: 3-2-6-4. Full path: 5-3-2-6-4-1.\n           - $I_2 \\xrightarrow{4} I_1 \\xrightarrow{2} S_2 \\xrightarrow{6} I_2 \\xrightarrow{3} I_1$. Sequence: 4-2-6-3. Full path: 5-4-2-6-3-1.\n        There are 6 paths starting with bridge 5.\n\n5.  **Calculate the total number of paths:**\n    *   Total paths = (Paths starting with 1) + (Paths starting with 5) = 6 + 6 = 12.\n\nFinal Answer: The final answer is $\\boxed{12}$",
        // o2: '…', o4: '…' 
      }
    },
    {
      id: 3,
      pid: 'math_568',
      text: "Peter rides his bike along a cycle path in a park. He starts at point $S$ and rides in the direction of the arrow. At the first crossing he turns right, then at the next left, and then again to the right and then again to left. Which crossing does he not reach?\n<image_1>",
      answer:'D',
      questionImage: './static/images/math_568_question.jpg',
      sketchImage: './static/images/math_568_human.png',
      models: { 
        o3: "Step\u00a01\u2002Understand the track  \nThe five labelled crossroads form a symmetric network.\n\n\u2022 A,\u00a0B,\u00a0C\u00a0and\u00a0D are the four corners of the inner square.  \n\u2022 Each of those four points is also joined to two semicircular \u201clobes\u201d, so at A,\u00a0B,\u00a0C,\u00a0D four ways meet.  \n\u2022 E is the point where the vertical path coming up from the square meets the top semicircle (so E is a real junction).  \n\u2022 The right\u2011hand lobe joins B to A; the top lobe joins B to C; the left lobe joins C to D; the bottom lobe joins D to A.\n\nStep\u00a02\u2002Follow Peter from the start S  \nPeter starts halfway up the right\u2011hand lobe and follows the arrow, i.e. he rides anticlockwise towards B.\n\nStep\u00a03\u2002Apply the sequence of turns  \n\n(1) First crossing (B) \u2013 arrive heading west.  \n\u2003Turn right \u21d2 go north onto the top lobe.\n\n(2) Next crossing (C) \u2013 arrive heading south.  \n\u2003Turn left \u21d2 go east along the upper side of the square (C\u00a0\u2192\u00a0B).\n\n(3) Next crossing (B again) \u2013 arrive heading east.  \n\u2003Turn right \u21d2 go south down the right side of the square (B\u00a0\u2192\u00a0A).\n\n(4) Next crossing (A) \u2013 arrive heading south.  \n\u2003Turn left \u21d2 go east onto the right\u2011hand lobe (A\u00a0\u2192\u00a0eastmost point).\n\nStep\u00a04\u2002Which crossroads have been reached?  \nDuring the ride Peter has passed through\n\nB  \u2192  C  \u2192  B  \u2192  A,\n\nand on the first leg he also crossed E while riding straight through the top semicircle.\n\nThe only labelled crossing he never reaches is D.\n\nAnswer:\u2003\\boxed{D}",
        Genimi_2_5_pro: "1.  **Identify Start and Direction:** Peter starts at point S and rides in the direction of the arrow, which is counter-clockwise along the outer path segment on the right side.\n\n2.  **First Crossing and Turn:** Peter rides from S towards the first crossing, which is B. At crossing B, he is instructed to turn right.\n    *   Approaching B from S, Peter is moving roughly upwards.\n    *   The options at B are: continue along the outer loop towards E (going left/straight along the curve), turn onto the inner path towards A (turning right), or turn onto the inner path towards C (turning sharp left).\n    *   Peter turns right, so he takes the path B -> A.\n    *   Path so far: S -> B -> A. Crossing B reached.\n\n3.  **Second Crossing and Turn:** Peter rides from B to A. At crossing A, he is instructed to turn left.\n    *   Approaching A from B, Peter is moving roughly downwards.\n    *   The options at A are: continue straight onto the inner path towards D, turn left onto the outer loop towards S, or turn right onto the outer loop towards D.\n    *   Peter turns left, so he takes the path A -> S (along the outer loop).\n    *   Path so far: S -> B -> A -> (outer loop towards S). Crossing A reached.\n\n4.  **Third Crossing and Turn:** Peter rides along the outer loop from A, passes S, and approaches B again. At crossing B, he is instructed to turn right (this is the third turn in the sequence Right, Left, Right, Left).\n    *   Approaching B from S, Peter is moving roughly upwards.\n    *   As before, turning right means taking the path B -> A.\n    *   Path so far: S -> B -> A -> (outer loop past S) -> B -> A.\n\n5.  **Fourth Crossing and Turn:** Peter rides from B to A again. At crossing A, he is instructed to turn left (this is the fourth turn).\n    *   Approaching A from B, Peter is moving roughly downwards.\n    *   As before, turning left means taking the path A -> S (along the outer loop).\n    *   Path so far: S -> B -> A -> (outer loop past S) -> B -> A -> (outer loop towards S).\n\n6.  **Analysis of Path:** The path Peter follows is S -> B -> A -> S -> B -> A -> S -> ... He only travels between crossings A and B and the segment of the outer loop containing S.\n\n7.  **Crossings Reached/Not Reached:**\n    *   Crossing B is reached.\n    *   Crossing A is reached.\n    *   Crossing C is never reached.\n    *   Crossing D is never reached.\n    *   Point E is never reached.\n\n8.  **Revisiting Interpretation:** The result that multiple crossings (C, D, E) are not reached contradicts the phrasing \"Which crossing does he not reach?\" (singular). This suggests the interpretation of \"left\" and \"right\" might be different. Let's try an alternative interpretation where \"Left\" and \"Right\" refer to taking the inner path.\n\n    *   **1. Start S -> B.**\n    *   **2. At B (1st crossing), Turn Right.** From S, the \"rightward\" inner path is towards A. Path: S -> B -> A. (B reached)\n    *   **3. At A (2nd crossing), Turn Left.** From B, the only inner path option is towards D. Let's assume \"Left\" means take the available inner path. Path: S -> B -> A -> D. (A reached)\n    *   **4. At D (3rd crossing), Turn Right.** From A, the only inner path option is towards C. Let's assume \"Right\" means take the available inner path. Path: S -> B -> A -> D -> C. (D reached)\n    *   **5. At C (4th crossing), Turn Left.** From D, the only inner path option is towards B. Let's assume \"Left\" means take the available inner path. Path: S -> B -> A -> D -> C -> B. (C reached)\n\n9.  **Analysis of Alternative Path:** The path under this interpretation is S -> B -> A -> D -> C -> B.\n    *   The crossings/points visited are B, A, D, C.\n    *   The point E, located on the top outer loop, is never on this path.\n\n10. **Conclusion:** Under the interpretation that \"Left/Right\" directs Peter onto the inner path network, Peter visits crossings B, A, D, and C, but he never rides on the top outer loop where E is located. Assuming \"crossing\" is used loosely to include point E, then E is the point Peter does not reach. This interpretation fits the singular phrasing of the question.\n\nFinal check:\n- Start S, go to B.\n- Turn 1 (Right) at B -> A. Visited: B. Path: B->A.\n- Turn 2 (Left) at A -> D. Visited: B, A. Path: A->D.\n- Turn 3 (Right) at D -> C. Visited: B, A, D. Path: D->C.\n- Turn 4 (Left) at C -> B. Visited: B, A, D, C. Path: C->B.\nThe path stays within the inner square (A, B, C, D) after the first turn. Point E on the outer loop is never reached.\n\nFinal Answer is E.\n\n\nFinal Answer: The final answer is $\\boxed{E}$",
        //  o2: '…', o4: '…' 
        }
    },
    {
      id: 4,
      pid: 'math_113',
      text: "All vehicles in the garage can only drive forwards or backwards. The black car wants to leave the garage (see diagram). What is the minimum number of grey vehicles that need to move at least a little bit so that this is possible?\n<image_1>",
      answer:'4',
      questionImage: './static/images/math_113_question.jpg',
      sketchImage: './static/images/math_113_human.png',
      models: { 
        o3: "Step\u00a01 \u2013 Identify the blocking piece  \nThe black car (length\u00a02, horizontal) is on the exit row.  \nSquare (row\u00a03,\u00a0col\u00a04) is occupied by the central vertical bus (length\u00a03).  \nUnless that bus moves, the exit row stays blocked.\n\nStep\u00a02 \u2013 How far must the bus move?  \nThe bus now occupies rows\u00a02\u20114 in column\u00a04.  \nMoving it  \n\u2022 1 square up \u21d2 still blocks row\u00a03.  \n\u2022 1 square down \u21d2 still blocks row\u00a03.  \nTherefore it has to move 2 squares down so that it ends in rows\u00a04\u20116 and row\u00a03 is free.\n\nStep\u00a03 \u2013 What stops the bus from moving 2 squares down?  \nRow\u00a06,\u00a0col\u00a04 is currently filled by the horizontal bus at the bottom (length\u00a03, row\u00a06,\u00a0cols\u00a02\u20114).  \nThat horizontal bus must shift to clear that square.\n\nStep\u00a04 \u2013 Can the bottom bus move?  \nIf it slides 1 square to the left it will occupy cols\u00a01\u20113;  \nrow\u00a06,\u00a0col\u00a01 is empty, so the move is possible and frees row\u00a06,\u00a0col\u00a04.\n\nStep\u00a05 \u2013 Sequence of moves  \n1. Move the bottom horizontal bus one square left.  \n2. Move the central vertical bus two squares down.  \n3. Drive the black car straight out to the right.\n\nOnly two grey vehicles (the bottom horizontal bus and the central vertical bus) need to move at all.\n\n\\boxed{2}",
        Genimi_2_5_pro: "*   **Step 1: Identify the Goal and Initial Obstacle**\n    The black car needs to move horizontally to the right to exit the garage. The path is immediately blocked by a long grey vehicle (let's call it Vehicle 1) positioned vertically just to the right of the black car.\n\n*   **Step 2: Move the First Obstacle (Vehicle 1)**\n    Vehicle 1 must be moved out of the black car's row. Since it's vertical, it can only move up or down. There is one empty square above it and one empty square below it. Moving Vehicle 1 either up one square or down one square will clear the space immediately in front of the black car. Let's assume we move Vehicle 1 down one square. This is the first grey vehicle moved.\n\n*   **Step 3: Identify the Next Obstacle**\n    After moving Vehicle 1 down, the black car can move one square to the right. However, the path to the exit is still blocked further down the row. Specifically, the exit square itself is blocked by a shorter grey vehicle (let's call it Vehicle 2) positioned vertically in the second column from the right.\n\n*   **Step 4: Move the Second Obstacle (Vehicle 2)**\n    Vehicle 2 must be moved out of the black car's exit row. Since it's vertical, it can only move up or down. There is one empty square above Vehicle 2. There is another grey car (Vehicle 3) directly below Vehicle 2, preventing it from moving down unless Vehicle 3 moves first. The simplest way to clear the path is to move Vehicle 2 up one square into the empty space above it. This is the second grey vehicle moved.\n\n*   **Step 5: Check the Path**\n    With Vehicle 1 moved down and Vehicle 2 moved up, the black car's path to the exit is now clear. It can move right two squares and exit the garage.\n\n*   **Step 6: Minimum Count**\n    We needed to move Vehicle 1 and Vehicle 2. No other vehicles needed to be moved to clear this specific path. Moving Vehicle 3 to allow Vehicle 2 to move down would require moving Vehicle 3 first, then Vehicle 2, and still Vehicle 1, resulting in 3 moves. Therefore, the minimum number of grey vehicles that need to move is 2.\n\n\\boxed{2}",
        //  o2: '…', o4: '…' 
        }
    },
    {
      id: 5,
      pid: 'phy_117',
      text: "\nA conductor lying in the \\( xy \\) plane is exposed to a magnetic field in the \\( +z \\) direction, and connected to a source of potential as shown above. Which statement correctly describes the electric field within the conductor?\n<image_1>\nA: There is only an \\( E \\) field in the \\( +x \\) direction\nB: There is only an \\( E \\) field in the \\( -x \\) direction\nC: There are \\( E \\) field components in the \\( +x \\) direction and the \\( +y \\) direction\nD: There are \\( E \\) field components in the \\( -x \\) direction and the \\( +y \\) direction\nE: There are \\( E \\) field components in the \\( +x \\) direction and the \\( -y \\) direction\n\n",
      answer:'D',
      questionImage: './static/images/phy_117_question.png',
      sketchImage: './static/images/phy_117_human.png',
      models: { 
        o3: "Step\u00a01\u00a0 \u2013\u00a0Direction of the current produced by the battery  \nFrom the sketch the long line of the cell (the + terminal, marked with \u201c+\u201d) is connected to the left\u2011hand lead, so conventional current leaves the + terminal, goes up the left wire, passes through the grey conductor from left to right and returns through the right\u2011hand wire.  \n\u21d2 v (current density) is toward +x inside the conductor.\n\nStep\u00a02\u00a0 \u2013\u00a0Magnetic force on the moving charges  \nThe conductor lies in the xy\u2011plane and the magnetic field is B = +z (out of the page).  \nFor a positive charge q moving with velocity v along +x,\n\n\u2003F\u00a0=\u00a0q\u00a0(v\u00a0\u00d7\u00a0B)  \n\u2003v\u00a0=\u00a0+\u00a0x\u0302 ,\u2003B\u00a0=\u00a0+\u00a0\u1e91  \n\u2003v\u00a0\u00d7\u00a0B\u00a0=\u00a0(+x\u0302)\u00a0\u00d7\u00a0(+\u1e91)\u00a0=\u00a0\u2013\u0177 .  \n\nSo the magnetic (Lorentz) force pushes the positive charges toward \u2212y (the bottom edge of the bar).\n\nStep\u00a03\u00a0 \u2013\u00a0Hall charge separation and Hall electric field  \nPositive charge builds up on the bottom edge (\u2212y) and negative charge on the top edge (+y) until the electric force balances the magnetic force.  \nThe resulting Hall electric field E_H points from the region of positive charge to the region of negative charge, i.e. from \u2212y toward +y: E_H is along +y.\n\nStep\u00a04\u00a0 \u2013\u00a0Total electric field inside the conductor  \n\u2022 The battery sets up a longitudinal field E_batt along +x (to drive the current).  \n\u2022 The Hall effect supplies a transverse field E_H along +y.  \n\nThus the net electric field inside the conductor possesses components in the +x and +y directions.\n\nThe correct statement is therefore option\u00a0C.\n\n\\boxed{C}",
        Genimi_2_5_pro:"*   **Step 1: Analyze the electric field due to the potential source.**\n    The conductor is connected to a battery. The positive terminal is on the left, and the negative terminal is on the right. This potential difference drives a current through the conductor. The electric field \\( \\vec{E}_{\\text{battery}} \\) established by the battery points from the higher potential (positive terminal) to the lower potential (negative terminal). According to the coordinate system shown, this field points in the \\( +x \\) direction. This field is responsible for driving the conventional current \\( \\vec{I} \\) in the \\( +x \\) direction.\n\n*   **Step 2: Analyze the motion of charge carriers and the magnetic force.**\n    Let's assume the charge carriers are positive charges \\( q \\) moving with a drift velocity \\( \\vec{v}_d \\). Since the conventional current is in the \\( +x \\) direction, \\( \\vec{v}_d \\) is also in the \\( +x \\) direction. The conductor is placed in a magnetic field \\( \\vec{B} \\) pointing in the \\( +z \\) direction. The magnetic force (Lorentz force) acting on these moving charges is given by \\( \\vec{F}_m = q (\\vec{v}_d \\times \\vec{B}) \\).\n    Using the right-hand rule for the cross product:\n    *   Point the fingers of your right hand in the direction of \\( \\vec{v}_d \\) (\\( +x \\)).\n    *   Curl your fingers towards the direction of \\( \\vec{B} \\) (\\( +z \\)).\n    *   Your thumb points in the direction of \\( \\vec{v}_d \\times \\vec{B} \\), which is the \\( -y \\) direction.\n    So, the magnetic force \\( \\vec{F}_m \\) on positive charge carriers is in the \\( -y \\) direction. (If we considered electrons with charge \\( -e \\) moving in the \\( -x \\) direction, the velocity is \\( \\vec{v}_e \\) in \\( -x \\). The force is \\( \\vec{F}_m = (-e) (\\vec{v}_e \\times \\vec{B}) \\). \\( \\vec{v}_e \\times \\vec{B} \\) is \\( (-x) \\times (+z) = +y \\). So \\( \\vec{F}_m \\) is in the \\( (-e)(+y) = -y \\) direction. The result is the same.)\n\n*   **Step 3: Analyze the charge accumulation and the Hall electric field.**\n    The magnetic force pushes the positive charge carriers towards the bottom edge of the conductor (in the \\( -y \\) direction) and effectively pushes negative charges (or leaves a deficit of positive charges) towards the top edge (in the \\( +y \\) direction). This separation of charges creates an electric field within the conductor, known as the Hall electric field \\( \\vec{E}_{\\text{Hall}} \\). This field points from the region of accumulated positive charge to the region of accumulated negative charge. Therefore, \\( \\vec{E}_{\\text{Hall}} \\) points from the bottom edge towards the top edge, which is in the \\( +y \\) direction.\n\n*   **Step 4: Determine the total electric field.**\n    The total electric field \\( \\vec{E}_{\\text{total}} \\) inside the conductor is the vector sum of the electric field due to the battery and the Hall electric field:\n    \\( \\vec{E}_{\\text{total}} = \\vec{E}_{\\text{battery}} + \\vec{E}_{\\text{Hall}} \\)\n    We found that \\( \\vec{E}_{\\text{battery}} \\) is in the \\( +x \\) direction and \\( \\vec{E}_{\\text{Hall}} \\) is in the \\( +y \\) direction.\n    Therefore, the total electric field has components in both the \\( +x \\) direction and the \\( +y \\) direction.\n\n*   **Step 5: Compare with the given options.**\n    Option C states that there are \\( E \\) field components in the \\( +x \\) direction and the \\( +y \\) direction. This matches our analysis.\n\nFinal Answer: The final answer is $\\boxed{C}$",
         o2: '…', o4: '…' }
    },
    {
      id: 6,
      pid: 'phy_58',
      text: "Consider a uniform isosceles triangle prism $\\mathrm{ABC}$, with the apex angle $\\theta=110^{\\circ}$ at vertex $\\mathrm{A}$. One of the sides, $\\mathrm{AC}$, is coated with silver, allowing it to function as a mirror. When a monochrome light-ray of wavelength $\\lambda$ approaches side $\\mathrm{AB}$ at an angle of incidence $\\alpha$, it first refracts, then reaches side AC, reflects, and continues to base BC. After another refraction, the ray eventually exits the prism at the angle of emergence which is also equal to the angle of incidence (see Fig. A).\n<image_1>\n\n\n\nWhat is the relative refractive index of the prism for that particular wavelength $\\lambda$ with respect to the outside environment, given that $\\alpha=70^{\\circ}$.\nA: 1.64\nB: 1.5436\nC: 1.5\nD: 1.06\n\n",
      answer:'B',
      questionImage: './static/images/phy_58_question.jpg',
      sketchImage: './static/images/phy_58_human.png',
      models: { 
        o3: "\\boxed{B}",
        Genimi_2_5_pro: "Step-by-step derivation:\n\n1.  **Identify the geometry and angles:**\n    The prism is isosceles with apex angle $\\angle A = \\theta = 110^{\\circ}$. The base angles are $\\angle B = \\angle C = (180^{\\circ} - 110^{\\circ}) / 2 = 35^{\\circ}$.\n    The light ray path is: Incident ray -> Refraction at side AB -> Ray PQ inside prism -> Reflection at side AC (mirror) -> Ray QR inside prism -> Refraction at side BC -> Emergent ray.\n    Let $n$ be the refractive index of the prism (relative to the outside environment, assumed $n_{env}=1$).\n    Angle of incidence at AB is $\\alpha = 70^{\\circ}$. Let the angle of refraction be $\\beta$.\n    Angle of incidence at AC is $\\gamma$. Angle of reflection is also $\\gamma$.\n    Angle of incidence at BC is $\\delta$. Angle of emergence is $\\alpha' = 70^{\\circ}$.\n\n2.  **Apply Snell's Law:**\n    At the first interface (AB): $1 \\cdot \\sin \\alpha = n \\sin \\beta \\implies \\sin 70^{\\circ} = n \\sin \\beta$. (Eq. 1)\n    At the third interface (BC): $n \\sin \\delta = 1 \\cdot \\sin \\alpha' \\implies n \\sin \\delta = \\sin 70^{\\circ}$. (Eq. 2)\n    From Eq. 1 and Eq. 2, we have $n \\sin \\beta = n \\sin \\delta$. Since $n \\neq 0$, $\\sin \\beta = \\sin \\delta$.\n    Since $\\beta$ and $\\delta$ are angles of refraction/incidence inside the prism, they must be acute angles ($0 < \\beta < 90^{\\circ}$ and $0 < \\delta < 90^{\\circ}$). Why?\n    For $\\beta$: $\\sin \\beta = (\\sin 70^{\\circ}) / n$. Since $n > 1$, $\\sin \\beta < \\sin 70^{\\circ} < 1$. $\\beta$ must be acute because the ray bends towards the normal ($\\beta < \\alpha = 70^{\\circ}$).\n    For $\\delta$: $\\sin \\delta = (\\sin 70^{\\circ}) / n$. $\\delta$ must be acute because it's the incident angle for refraction out of the prism, and it must be less than the critical angle $\\theta_c = \\arcsin(1/n)$. $\\sin \\delta < 1/n$ requires $\\sin 70 / n < 1/n$, which is true. Physically, the angle of incidence inside the denser medium is acute.\n    Therefore, $\\sin \\beta = \\sin \\delta$ implies $\\beta = \\delta$. (Eq. 3)\n\n3.  **Apply geometry using angles inside the prism:**\n    Let P be the point on AB, Q on AC, R on BC.\n    Consider triangle APQ. The angles are $\\angle A = 110^{\\circ}$, $\\angle APQ = 90^{\\circ} - \\beta$ (angle between ray PQ and side AB), and $\\angle AQP = 90^{\\circ} - \\gamma$ (angle between ray PQ and side AC).\n    The sum of angles in $\\triangle APQ$ is $180^{\\circ}$:\n    $110^{\\circ} + (90^{\\circ} - \\beta) + (90^{\\circ} - \\gamma) = 180^{\\circ}$\n    $290^{\\circ} - (\\beta + \\gamma) = 180^{\\circ}$\n    $\\beta + \\gamma = 110^{\\circ}$. (Eq. 4)\n\n    Consider triangle CQR. The angles are $\\angle C = 35^{\\circ}$, $\\angle CQR = 90^{\\circ} - \\gamma$ (angle between ray QR and side AC), and $\\angle CRQ = 90^{\\circ} - \\delta$ (angle between ray QR and side BC).\n    The sum of angles in $\\triangle CQR$ is $180^{\\circ}$:\n    $35^{\\circ} + (90^{\\circ} - \\gamma) + (90^{\\circ} - \\delta) = 180^{\\circ}$\n    $215^{\\circ} - (\\gamma + \\delta) = 180^{\\circ}$\n    $\\gamma + \\delta = 35^{\\circ}$. (Eq. 5)\n\n4.  **Analyze the system of equations:**\n    We have the following system:\n    (3) $\\beta = \\delta$\n    (4) $\\beta + \\gamma = 110^{\\circ}$\n    (5) $\\gamma + \\delta = 35^{\\circ}$\n\n    Substitute $\\beta = \\delta$ into Eq. 5:\n    $\\gamma + \\beta = 35^{\\circ}$.\n\n    Now compare this with Eq. 4:\n    $\\beta + \\gamma = 110^{\\circ}$\n    $\\beta + \\gamma = 35^{\\circ}$\n    This leads to the contradiction $110^{\\circ} = 35^{\\circ}$.\n\n5.  **Conclusion about the problem statement:**\n    The geometric relations derived from the described path and prism angles are inconsistent with the physical condition ($\\beta = \\delta$) derived from Snell's law and the condition $\\alpha = \\alpha'$. This indicates that the scenario described in the problem (the specific prism shape, ray path, and condition $\\alpha=\\alpha'$) is geometrically impossible.\n\n6.  **Reconsideration / Potential Issues:**\n    Given that this is a multiple-choice question, there might be a typo in the problem statement (e.g., the value of $\\theta$ or $\\alpha$), or a misunderstanding of the diagram or definitions. However, based on the standard interpretation of prism problems and optics principles, the derivation leads to a contradiction.\n\n7.  **Checking options (if forced):**\n    Since a rigorous solution is impossible, we cannot logically arrive at one of the options. If we were forced to guess or assume there's a non-obvious interpretation or a typo that leads to one answer, we could plug the options into the derived equations to see if any yield a \"close\" result, but this is not mathematically sound. For instance, trying $n=1.64$ (Option A):\n    $\\beta = \\delta = \\arcsin(\\sin 70^\\circ / 1.64) \\approx \\arcsin(0.9397 / 1.64) \\approx \\arcsin(0.5730) \\approx 34.96^\\circ$.\n    From Eq. 4: $\\gamma = 110^\\circ - \\beta \\approx 110^\\circ - 34.96^\\circ = 75.04^\\circ$.\n    From Eq. 5: $\\gamma = 35^\\circ - \\delta \\approx 35^\\circ - 34.96^\\circ = 0.04^\\circ$.\n    The values of $\\gamma$ are vastly different, confirming the inconsistency.\n\nFinal conclusion based on derivation: The problem statement is inconsistent, making it impossible to solve as written. There is no correct answer among the options based on a valid physical and geometrical derivation. However, if we must choose an answer provided, it implies there is some intended solution path, possibly involving a misinterpretation or a specific context not fully described. Without further clarification or correction, selecting an answer is speculative.\n\nAssuming there might be a conventional answer expected despite the inconsistency, but without a valid derivation, I cannot proceed further. Let's assume, for the sake of providing an answer from the options, that option A is the intended answer, possibly due to a context or convention not understood from the problem statement alone.\n\n\nFinal Answer: The final answer is $\\boxed{A}$",
        //  o2: '…', o4: '…' 
        }
    },
    {
      id: 7,
      pid: 'phy_98',
      text: "\nTo verify Ohm's law, a student is provided with a test resistor $R_T$, a high resistance $R_1$, a small resistance $R_2$, two identical galvanometers $G_1$ and $G_2$, and a variable voltage source V. The correct circuit to carry out the experiment is\n<image_1>\nA: A\nB: B\nC: C\nD: D\n\n",
      answer:'C',
      questionImage: './static/images/phy_98_question.jpg',
      sketchImage: './static/images/phy_98_human.png',
      models: { 
        o3: "\\boxed{B}",
        Genimi_2_5_pro: "*   **Objective:** Verify Ohm's law for a test resistor $R_T$. This requires measuring the voltage (V) across $R_T$ and the current (I) flowing through $R_T$.\n*   **Components:** Test resistor $R_T$, high resistance $R_1$, small resistance $R_2$, two identical galvanometers $G_1$ and $G_2$, variable voltage source V.\n*   **Measurement Instruments:** We need to construct a voltmeter and an ammeter using the galvanometers and resistors.\n    *   **Voltmeter:** A galvanometer can be converted into a voltmeter by connecting a high resistance in series with it. The voltmeter is then connected in parallel across the component whose voltage is to be measured.\n    *   **Ammeter:** A galvanometer can be converted into an ammeter by connecting a small resistance (shunt) in parallel with it. The ammeter is then connected in series with the component through which the current is to be measured.\n\n*   **Analysis of Circuit Options:**\n\n    *   **Option A:**\n        *   $G_1$ is in parallel with $R_2$ (small resistance). This forms an ammeter. It is connected in parallel with $R_T$. An ammeter should be in series, and a voltmeter should be in parallel. This connection is incorrect.\n        *   $G_2$ is in series with $R_1$ (high resistance). This forms a voltmeter. It is connected in series with $R_T$. A voltmeter should be in parallel, and an ammeter should be in series. This connection is incorrect.\n        *   Circuit A is incorrect.\n\n    *   **Option B:**\n        *   $G_1$ is in parallel with $R_1$ (high resistance). This is not a standard configuration for a voltmeter or ammeter. An ammeter uses a small parallel resistance. A voltmeter uses a high series resistance. This part is incorrect.\n        *   $G_2$ is in series with $R_2$ (small resistance). This is not a standard configuration. An ammeter uses a small parallel resistance. A voltmeter uses a high series resistance. This part is incorrect.\n        *   Circuit B is incorrect.\n\n    *   **Option C:**\n        *   $G_1$ is in series with $R_1$ (high resistance). This forms a voltmeter ($V_{meter}$). This voltmeter is connected in parallel across $R_T$. This correctly measures the voltage across $R_T$.\n        *   $G_2$ is in parallel with $R_2$ (small resistance). This forms an ammeter ($A_{meter}$). This ammeter is connected in series with the parallel combination of $R_T$ and the voltmeter ($G_1 + R_1$). This correctly measures the total current flowing towards $R_T$ and the voltmeter.\n        *   This circuit configuration allows for the measurement of voltage across $R_T$ and the current entering the parallel branch containing $R_T$. By varying the voltage source V, one can obtain multiple readings of voltage and current to verify Ohm's law. This is a standard and correct setup. The ammeter measures the current $I_{total} = I_{R_T} + I_{Voltmeter}$. The voltmeter measures $V_{R_T}$. If the voltmeter resistance ($R_{G1} + R_1$) is much larger than $R_T$, then $I_{Voltmeter}$ is negligible compared to $I_{R_T}$, and $I_{total} \\approx I_{R_T}$. Thus, plotting $V_{R_T}$ vs $I_{total}$ will approximately verify Ohm's law for $R_T$.\n        *   Circuit C is correct.\n\n    *   **Option D:**\n        *   $G_1$ is in parallel with $R_2$ (small resistance). This forms an ammeter. It is connected in parallel with $R_T$. Incorrect connection for measuring voltage.\n        *   $G_2$ is in parallel with $R_1$ (high resistance). Not a standard ammeter configuration. It is connected in series with $R_T$. Incorrect connection for measuring current.\n        *   Circuit D is incorrect.\n\n*   **Conclusion:** Based on the principles of constructing voltmeters and ammeters from galvanometers and their correct placement in a circuit to verify Ohm's law, circuit C is the correct configuration.\n\nFinal Answer: The final answer is $\\boxed{C}$",
        //  o2: '…', o4: '…' 
        }
    },
    {
      id: 8,
      pid: 'phy_102',
      text: "\nA small object is placed 50 cm to the left of a thin convex lens of focal length 30 cm. A convex spherical mirror of radius of curvature 100 cm is placed to the right of the lens at a distance of 50 cm. The mirror is tilted such that the axis of the mirror is at an angle \u03b8 = 30\u00b0 to the axis of the lens, as shown in the figure.\n\nIf the origin of the coordinate system is taken to be at the centre of the lens, the coordinates (in cm) of the point (x,y) at which the image is formed are\n<image_1>\n\nA: (0, 0)\nB: (50 - 25\u221a3, 25)\nC: (25, 25\u221a3)\nD: (125/3, 25/\u221a3)\n",
      answer:'C',
      questionImage: './static/images/phy_102_question.jpg',
      sketchImage: './static/images/phy_102_human.jpg',
      models: { 
        o3: "\\boxed{D}",
        Genimi_2_5_pro: "**Step-by-step derivation:**\n\n1.  **Image formation by the lens:**\n    The object is placed at u = -50 cm from the convex lens with focal length f_lens = +30 cm.\n    Using the lens formula: 1/v - 1/u = 1/f\n    1/v - 1/(-50) = 1/30\n    1/v + 1/50 = 1/30\n    1/v = 1/30 - 1/50 = (5 - 3) / 150 = 2 / 150 = 1 / 75\n    v = +75 cm.\n    The lens forms a real image (I1) at x = +75 cm. Since the object is on the axis (y=0), the image I1 is also on the axis. The coordinates of I1 are (75, 0) with respect to the lens origin.\n\n2.  **Object for the mirror:**\n    The image I1 acts as the object for the convex spherical mirror. The mirror is placed at x = +50 cm. The pole of the mirror (P) is at (50, 0).\n    The object I1 is located at (75, 0). The position of I1 relative to the pole P is (x_rel, y_rel) = (75 - 50, 0 - 0) = (25, 0).\n\n3.  **Coordinate transformation to the mirror's frame:**\n    The mirror's axis is tilted at \u03b8 = 30\u00b0 to the lens axis. From the diagram, the tilt is downwards, so the angle of the mirror axis (x') relative to the lens axis (x_rel) is \u03b1 = -30\u00b0.\n    We need to find the coordinates of the object I1 in the mirror's frame (x', y'), which is centered at P and rotated by \u03b1 = -30\u00b0.\n    The transformation formulas for rotating a point (x, y) by an angle \u03b2 are:\n    x' = x cos \u03b2 + y sin \u03b2\n    y' = -x sin \u03b2 + y cos \u03b2\n    Here, we transform the point (x_rel=25, y_rel=0) into the (x', y') frame. This corresponds to rotating the point by -\u03b1 = +30\u00b0.\n    x' = x_rel cos(30\u00b0) + y_rel sin(30\u00b0) = 25 * (\u221a3 / 2) + 0 * (1 / 2) = 25\u221a3 / 2. This is the object distance along the mirror axis, u'.\n    y' = -x_rel sin(30\u00b0) + y_rel cos(30\u00b0) = -25 * (1 / 2) + 0 * (\u221a3 / 2) = -12.5. This is the object height perpendicular to the mirror axis, h'.\n    So, the object for the mirror in its own coordinate system is (u' = 25\u221a3 / 2, h' = -12.5).\n\n4.  **Image formation by the mirror:**\n    The mirror is convex with radius R = 100 cm. Its focal length is f_mirror = R/2 = +50 cm.\n    Using the mirror formula: 1/v' + 1/u' = 1/f_mirror\n    1/v' + 1/(25\u221a3 / 2) = 1/50\n    1/v' = 1/50 - 2/(25\u221a3) = 1/50 - 4/(50\u221a3) = (\u221a3 - 4) / (50\u221a3)\n    v' = 50\u221a3 / (\u221a3 - 4). This is the image distance along the mirror axis.\n    Magnification m' = -v' / u'\n    m' = - [50\u221a3 / (\u221a3 - 4)] / [25\u221a3 / 2] = - [50\u221a3 / (\u221a3 - 4)] * [2 / (25\u221a3)] = -4 / (\u221a3 - 4)\n    Image height h'' = m' * h'\n    h'' = [-4 / (\u221a3 - 4)] * (-12.5) = [-4 / (\u221a3 - 4)] * (-25 / 2) = 50 / (\u221a3 - 4)\n    h'' = 50 * (\u221a3 + 4) / ((\u221a3 - 4)(\u221a3 + 4)) = 50(\u221a3 + 4) / (3 - 16) = -50(\u221a3 + 4) / 13.\n    The image I2 in the mirror's frame is at (x' = v', y' = h'').\n\n5.  **Coordinate transformation back to the lens frame:**\n    We transform the image coordinates (x' = v', y' = h'') back to the (x_rel, y_rel) frame centered at P. This involves rotating the point by \u03b1 = -30\u00b0.\n    x_rel = x' cos(-30\u00b0) + y' sin(-30\u00b0) = v'(\u221a3/2) + h''(-1/2)\n    y_rel = -x' sin(-30\u00b0) + y' cos(-30\u00b0) = -v'(-1/2) + h''(\u221a3/2) = v'/2 + h''\u221a3/2\n    x_rel = [50\u221a3 / (\u221a3 - 4)] * (\u221a3/2) + [-50(\u221a3 + 4) / 13] * (-1/2)\n    x_rel = [75 / (\u221a3 - 4)] + [25(\u221a3 + 4) / 13]\n    Using 1/(\u221a3 - 4) = -(\u221a3 + 4)/13:\n    x_rel = 75 * [-(\u221a3 + 4)/13] + [25(\u221a3 + 4) / 13] = [-75(\u221a3 + 4) + 25(\u221a3 + 4)] / 13 = -50(\u221a3 + 4) / 13 = (-200 - 50\u221a3) / 13.\n    y_rel = [50\u221a3 / (\u221a3 - 4)] * (1/2) + [-50(\u221a3 + 4) / 13] * (\u221a3/2)\n    y_rel = [25\u221a3 / (\u221a3 - 4)] - [25\u221a3(\u221a3 + 4) / 13]\n    y_rel = 25\u221a3 * [-(\u221a3 + 4)/13] - [25\u221a3(\u221a3 + 4) / 13] = [-25\u221a3(\u221a3 + 4) - 25\u221a3(\u221a3 + 4)] / 13 = -50\u221a3(\u221a3 + 4) / 13 = -(150 + 200\u221a3) / 13.\n\n6.  **Final coordinates:**\n    The coordinates in the original lens frame (x, y) are:\n    x = x_rel + 50 = (-200 - 50\u221a3) / 13 + 50 = (-200 - 50\u221a3 + 650) / 13 = (450 - 50\u221a3) / 13.\n    y = y_rel = -(150 + 200\u221a3) / 13.\n    Numerically:\n    x \u2248 (450 - 50 * 1.732) / 13 = (450 - 86.6) / 13 = 363.4 / 13 \u2248 27.95 cm.\n    y \u2248 -(150 + 200 * 1.732) / 13 = -(150 + 346.4) / 13 = -496.4 / 13 \u2248 -38.18 cm.\n    This result (27.95, -38.18) does not match any of the options closely.\n\n7.  **Revisiting approximations and options:**\n    Let's test the approximation used in step 7 of the thought process, which led exactly to option B. This approximation assumes the object distance for the mirror is the distance along the lens axis (u'=25) and the object height relative to the mirror axis is zero (h'=0).\n    Object for mirror: u' = 25, h' = 0.\n    Mirror formula: 1/v' + 1/u' = 1/f => 1/v' + 1/25 = 1/50 => 1/v' = 1/50 - 1/25 = -1/50 => v' = -50.\n    Magnification: m' = -v'/u' = -(-50)/25 = 2.\n    Image height: h'' = m' * h' = 2 * 0 = 0.\n    Image in mirror frame: (x' = -50, y' = 0).\n    Transform back to lens frame (rotate point by -30\u00b0):\n    x_rel = x' cos(-30\u00b0) + y' sin(-30\u00b0) = (-50)(\u221a3/2) + 0 = -25\u221a3.\n    y_rel = -x' sin(-30\u00b0) + y' cos(-30\u00b0) = -(-50)(-1/2) + 0 = -25.\n    Final coordinates:\n    x = x_rel + 50 = -25\u221a3 + 50 = 50 - 25\u221a3.\n    y = y_rel = -25.\n    This result is (50 - 25\u221a3, -25). This matches the x-coordinate of option B, but the y-coordinate is -25 instead of +25.\n\n8.  **Let's re-check the rotation formula used for transformation back:**\n    We have point (x', y') in the rotated frame (mirror frame). We want coordinates (x_rel, y_rel) in the original frame (lens frame at P). The angle of the rotated frame is \u03b1 = -30\u00b0.\n    x_rel = x' cos \u03b1 - y' sin \u03b1 = x' cos(-30) - y' sin(-30) = x'(\u221a3/2) - y'(-1/2) = x'\u221a3/2 + y'/2.\n    y_rel = x' sin \u03b1 + y' cos \u03b1 = x' sin(-30) + y' cos(-30) = x'(-1/2) + y'(\u221a3/2) = -x'/2 + y'\u221a3/2.\n    Using (x'=-50, y'=0) from the approximation:\n    x_rel = (-50)\u221a3/2 + 0 = -25\u221a3.\n    y_rel = -(-50)/2 + 0 = 25.\n    Final coordinates:\n    x = x_rel + 50 = 50 - 25\u221a3.\n    y = y_rel = 25.\n    This exactly matches option B: (50 - 25\u221a3, 25).\n\nAlthough the approximation used is physically inconsistent (treating the object as simultaneously on-axis for the mirror, h'=0, but using the distance u'=25 which is not the distance along the mirror axis), it leads exactly to option B. Given the discrepancy of the rigorous calculation with all options, it is plausible that this simplified approach was intended.\n\nFinal Answer is Option B.\n\n```boxed{B}```",
        //  o2: '…', o4: '…' 
        }
    }
    // {
    //   id: 9,
    //   pid: 'phy_121',
    //   text: "\nFour charges are placed at the corners of a square with sides of length \\(d\\) as shown above. The electric field at point \\(X\\) in the center of the square is:\n<image_1>\nA: \\( \\frac{4kq}{d^2} \\), to the upper right\nB: \\( \\frac{4kq}{d^2} \\), to the lower left\nC: \\( \\frac{3kq}{d^2} \\), to the upper right\nD: \\( \\frac{2kq}{d^2} \\), to the upper right\nE: \\( \\frac{2kq}{d^2} \\), to the lower left\n\n",
    //   answer:'A',
    //   questionImage: './static/images/phy_121_question.png',
    //   sketchImage: './static/images/phy_121_human.png',
    //   models: { 
    //     o3: "\\boxed{D}",
    //     Genimi_2_5_pro: "**1. Identify the charges and their positions:**\n   - Top Left (TL): Charge \\(-q\\)\n   - Top Right (TR): Charge \\(-q\\)\n   - Bottom Left (BL): Charge \\(+q\\)\n   - Bottom Right (BR): Charge \\(-q\\)\n   - Point \\(X\\) is at the center of the square with side length \\(d\\).\n\n**2. Calculate the distance from each corner to the center \\(X\\):**\n   - The diagonal of the square has length \\(D = \\sqrt{d^2 + d^2} = d\\sqrt{2}\\).\n   - The distance \\(r\\) from any corner to the center \\(X\\) is half the diagonal length: \\(r = \\frac{D}{2} = \\frac{d\\sqrt{2}}{2}\\).\n   - The square of this distance is \\(r^2 = \\left(\\frac{d\\sqrt{2}}{2}\\right)^2 = \\frac{d^2 \\cdot 2}{4} = \\frac{d^2}{2}\\).\n\n**3. Calculate the magnitude of the electric field produced by each charge at point \\(X\\):**\n   - The magnitude of the electric field \\(E\\) from a point charge \\(Q\\) at distance \\(r\\) is \\(E = k \\frac{|Q|}{r^2}\\).\n   - Since all charges have magnitude \\(q\\) and are at the same distance \\(r\\) from \\(X\\), the magnitude of the electric field produced by each charge at \\(X\\) is the same:\n     \\(E_{each} = k \\frac{q}{r^2} = k \\frac{q}{(d^2/2)} = \\frac{2kq}{d^2}\\).\n\n**4. Determine the direction of the electric field from each charge at point \\(X\\):**\n   - Electric fields point away from positive charges and towards negative charges.\n   - \\(\\vec{E}_{TL}\\): Due to \\(-q\\) at TL, points towards TL (up and left).\n   - \\(\\vec{E}_{TR}\\): Due to \\(-q\\) at TR, points towards TR (up and right).\n   - \\(\\vec{E}_{BL}\\): Due to \\(+q\\) at BL, points away from BL (up and right).\n   - \\(\\vec{E}_{BR}\\): Due to \\(-q\\) at BR, points towards BR (down and right).\n\n**5. Find the vector sum of the electric fields:**\n   - The total electric field at \\(X\\) is \\(\\vec{E}_{total} = \\vec{E}_{TL} + \\vec{E}_{TR} + \\vec{E}_{BL} + \\vec{E}_{BR}\\).\n   - Observe the directions:\n     - \\(\\vec{E}_{TR}\\) and \\(\\vec{E}_{BL}\\) both point towards the upper right. They have the same magnitude \\(E_{each}\\). Their sum is \\( \\vec{E}_{TR} + \\vec{E}_{BL} \\), a vector pointing upper right with magnitude \\(E_{each} + E_{each} = 2 E_{each}\\).\n     - \\(\\vec{E}_{TL}\\) points towards the upper left, and \\(\\vec{E}_{BR}\\) points towards the lower right. These two vectors have the same magnitude \\(E_{each}\\) but point in opposite directions (135\u00b0 and 315\u00b0 or -45\u00b0). Therefore, they cancel each other out: \\( \\vec{E}_{TL} + \\vec{E}_{BR} = 0 \\).\n\n**6. Calculate the net electric field:**\n   - \\( \\vec{E}_{total} = (\\vec{E}_{TR} + \\vec{E}_{BL}) + (\\vec{E}_{TL} + \\vec{E}_{BR}) = (\\vec{E}_{TR} + \\vec{E}_{BL}) + 0 \\).\n   - The total electric field is the sum of \\(\\vec{E}_{TR}\\) and \\(\\vec{E}_{BL}\\), both pointing towards the upper right.\n   - The magnitude of the total electric field is \\( E_{total} = E_{each} + E_{each} = 2 E_{each} \\).\n   - Substitute the value of \\(E_{each}\\): \\( E_{total} = 2 \\times \\left(\\frac{2kq}{d^2}\\right) = \\frac{4kq}{d^2} \\).\n   - The direction of the total electric field is towards the upper right.\n\n**7. Compare with the options:**\n   - Option A: \\( \\frac{4kq}{d^2} \\), to the upper right. This matches our result.\n\nFinal Answer: The final answer is $\\boxed{A}$",
    //      o2: '…', o4: '…' }
    // }



    // … 
  ];



  // 获取元素引用
  const qSel      = document.getElementById('questionSelect');
  const mSel      = document.getElementById('modelSelect');
  const qTxt      = document.getElementById('questionText');
  const qImg      = document.getElementById('questionImage');
  const sImg      = document.getElementById('sketchImage');
  const mCnt      = document.getElementById('modelContent');
  const btnRefresh = document.getElementById('refreshQuestion');

  //—— 填充 Question 下拉 —— 
  interactiveData.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.pid}`;
    qSel.appendChild(opt);
  });

  //—— 根据选中 question 重建 Model 下拉 —— 
  function rebuildModelSelect(qData) {
    mSel.innerHTML = '';
    Object.keys(qData.models).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      mSel.appendChild(opt);
    });
  }

  

  //—— 渲染当前 question + sketch + model 输出 —— 
  function renderAll() {
    const qId = Number(qSel.value);
    const modelKey = mSel.value;
    const qData = interactiveData.find(d => d.id === qId);
    if (!qData) return;
    // 文本
    qTxt.textContent = qData.text;
    // 图片
    qImg.src = qData.questionImage;
    sImg.src = qData.sketchImage;
    // model 内容
    mCnt.textContent = qData.models[modelKey] ?? '';
      // 新增：把 answer 填到页面上
    const ansP = document.getElementById('answerText');
    ansP.innerHTML = `<strong>Answer: ${qData.answer}</strong>`;
  }

  

  //—— 事件绑定 ——  
  // Q 下拉切换
  qSel.addEventListener('change', () => {
    const qData = interactiveData.find(d => d.id === Number(qSel.value));
    rebuildModelSelect(qData);
    renderAll();
  });
  // Model 下拉切换
  mSel.addEventListener('change', renderAll);
  // Refresh 随机
  btnRefresh.addEventListener('click', () => {
    const idx = Math.floor(Math.random() * interactiveData.length);
    qSel.value = interactiveData[idx].id;
    qSel.dispatchEvent(new Event('change'));
  });

  //—— 初始调用 —— 
  qSel.value = interactiveData[0].id;
  rebuildModelSelect(interactiveData[0]);
  renderAll();
});
