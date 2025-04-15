
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
