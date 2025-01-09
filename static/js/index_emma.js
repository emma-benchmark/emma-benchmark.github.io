// 如果你还需要 bulmaCarousel 的初始化，可以保留；否则可根据需要删除
$(document).ready(function() {
  const options = {
    slidesToScroll: 1,
    slidesToShow: 1,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  };
  // Initialize all div with carousel class
  const carousels = bulmaCarousel.attach('.carousel', options);
});

document.addEventListener('DOMContentLoaded', function() {
  loadTableData();
  setupEventListeners();
  window.addEventListener('resize', adjustNameColumnWidth);
});

/**
 * 加载表格数据
 */
function loadTableData() {
  console.log('Starting to load table data...');
  fetch('./emma_data.json')
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

      // 为 EMMA 和 EMMA-Mini 准备排名信息（用于加粗或下划线）
      const emmaScores = prepareScoresForStyling(data.leaderboardData, 'emma');
      const emmaMiniScores = prepareScoresForStyling(data.leaderboardData, 'emma-mini');

      data.leaderboardData.forEach((row, index) => {
        const tr = document.createElement('tr');
        // 比如加上 row.info.type 当作一个标识，以后可用来改变背景色等
        tr.classList.add(row.info.type || 'unknown');

        // 如果有外部链接，则加上超链接
        const nameCell = (row.info.link && row.info.link.trim() !== '')
          ? `<a href="${row.info.link}" target="_blank"><b>${row.info.name}</b></a>`
          : `<b>${row.info.name}</b>`;

        // 安全获取对象中的属性
        const safeGet = (obj, path, defaultValue = '-') => {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;
        };

        // 格式化 Overall 的值，有些项目带星号
        const formatOverallValue = (value, source) => {
          // 例如，如果 source 是 "author" 就可以加 *
          // 这里的逻辑根据你的实际情况调整
          return (source === 'author') ? `${value || '-'}*` : `${value || '-'}`;
        };

        // EMMA 的 Overall
        const emmaOverall = formatOverallValue(
          applyStyle(safeGet(row, 'emma.overall'), emmaScores.overall[index]),
          safeGet(row, 'emma.source')
        );
        // EMMA-Mini 的 Overall
        const emmaMiniOverall = formatOverallValue(
          applyStyle(safeGet(row, 'emma-mini.overall'), emmaMiniScores.overall[index]),
          safeGet(row, 'emma-mini.source')
        );

        tr.innerHTML = `
          <td>${nameCell}</td>
          <td>${row.info.size || '-'}</td>
          <td>${row.info.date || '-'}</td>

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

      // 调整 Name 的列宽
      setTimeout(adjustNameColumnWidth, 0);
      // 初始化排序（默认先按某个列排序，比如 EMMA-Mini Overall）
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

/**
 * 设置事件监听，例如点击表头展开/折叠、重置等
 */
function setupEventListeners() {
  // Reset
  document.querySelector('.reset-cell').addEventListener('click', function() {
    resetTable();
  });

  // 展开/折叠 EMMA 的详细列
  document.querySelector('.emma-details-cell').addEventListener('click', function() {
    toggleDetails('emma');
  });

  // 展开/折叠 EMMA-Mini 的详细列
  document.querySelector('.emma-mini-details-cell').addEventListener('click', function() {
    toggleDetails('emma-mini');
  });

  // 可排序表头
  const headers = document.querySelectorAll('#emma-table thead tr:last-child th.sortable');
  headers.forEach(header => {
    header.addEventListener('click', function() {
      sortTable(this);
    });
  });
}

/**
 * 展开或折叠指定分区的详细列
 */
function toggleDetails(section) {
  // 只有两个分区
  const sections = ['emma', 'emma-mini'];
  sections.forEach(sec => {
    const detailCells = document.querySelectorAll('.' + sec + '-details');
    const overallCells = document.querySelectorAll('.' + sec + '-overall');
    const headerCell = document.querySelector('.' + sec + '-details-cell');
    if (sec === section) {
      // 点击的分区执行 toggle
      detailCells.forEach(cell => cell.classList.toggle('hidden'));
      // 根据是否展开，动态调整 colspan
      const currentColspan = headerCell.getAttribute('colspan');
      // 如果之前是 1，则展开；如果之前是 4，则折叠(因为我们有4列 detail)
      headerCell.setAttribute('colspan', currentColspan === '1' ? '5' : '1');
    } else {
      // 其他分区确保收起
      detailCells.forEach(cell => cell.classList.add('hidden'));
      overallCells.forEach(cell => cell.classList.remove('hidden'));
      const otherHeaderCell = document.querySelector('.' + sec + '-details-cell');
      otherHeaderCell.setAttribute('colspan', '1');
    }
  });

  setTimeout(adjustNameColumnWidth, 0);
}

/**
 * 重置表格到初始状态
 */
function resetTable() {
  // 折叠所有 detail
  document.querySelectorAll('.emma-details, .emma-mini-details').forEach(function(cell) {
    cell.classList.add('hidden');
  });

  // 显示所有 overall
  document.querySelectorAll('.emma-overall, .emma-mini-overall').forEach(function(cell) {
    cell.classList.remove('hidden');
  });

  // 将表头的 colspan 也复原为 1
  document.querySelector('.emma-details-cell').setAttribute('colspan', '1');
  document.querySelector('.emma-mini-details-cell').setAttribute('colspan', '1');

  // 默认按 EMMA-Mini Overall 倒序排（可根据需求改成 emma-overall）
  const emmaMiniOverallHeader = document.querySelector('#emma-table thead tr:last-child th.emma-mini-overall');
  sortTable(emmaMiniOverallHeader, true);

  setTimeout(adjustNameColumnWidth, 0);
}

/**
 * 表头排序
 * @param {HTMLElement} header - 被点击的表头单元格
 * @param {boolean} forceDescending - 是否强制使用倒序（在 reset 时用到）
 * @param {boolean} maintainOrder - 是否维持原有顺序（可根据需要决定是否使用）
 */
function sortTable(header, forceDescending = false, maintainOrder = false) {
  const table = document.getElementById('emma-table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const headers = Array.from(header.parentNode.children);
  const columnIndex = headers.indexOf(header);
  const sortType = header.dataset.sort;

  // 判断是升序还是降序
  const isDescending = forceDescending ||
    (!header.classList.contains('asc') && !header.classList.contains('desc')) ||
    header.classList.contains('asc');

  if (!maintainOrder) {
    rows.sort((a, b) => {
      let aValue = getCellValue(a, columnIndex);
      let bValue = getCellValue(b, columnIndex);

      // 处理空值的情况
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
        // 字符串排序
        return isDescending
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }
    });
  }

  // 清除其他列的排序标记
  headers.forEach(th => th.classList.remove('asc', 'desc'));
  // 给当前列加上排序标记
  header.classList.add(isDescending ? 'desc' : 'asc');

  // 重新放回排序后的行
  rows.forEach(row => tbody.appendChild(row));

  setTimeout(adjustNameColumnWidth, 0);
}

/**
 * 根据行和列号，获取对应单元格的文字 (兼容隐藏/展开列)
 */
function getCellValue(row, index) {
  const cells = Array.from(row.children);
  let cell = cells[index];

  // 如果点击的是隐藏列，则找找同一区域里没隐藏的那个单元格
  if (cell && cell.classList.contains('hidden')) {
    if (cell.classList.contains('emma-details') || cell.classList.contains('emma-overall')) {
      // 找到 emma-overall 或 emma-details 中未隐藏的
      cell = cells.find(c =>
        (c.classList.contains('emma-overall') || c.classList.contains('emma-details')) &&
        !c.classList.contains('hidden')
      );
    } else if (cell.classList.contains('emma-mini-details') || cell.classList.contains('emma-mini-overall')) {
      // 找到 emma-mini-overall 或 emma-mini-details 中未隐藏的
      cell = cells.find(c =>
        (c.classList.contains('emma-mini-overall') || c.classList.contains('emma-mini-details')) &&
        !c.classList.contains('hidden')
      );
    }
  }
  return cell ? cell.textContent.trim() : '';
}

/**
 * 初始化时默认按某列排序
 */
function initializeSorting() {
  // 示例：默认用 EMMA-Mini Overall 排序（倒序）
  const emmaMiniOverallHeader = document.querySelector('#emma-table thead tr:last-child th.emma-mini-overall');
  sortTable(emmaMiniOverallHeader, true);
}

/**
 * 动态调整“Name”列的宽度，以避免展开后表格抖动
 */
function adjustNameColumnWidth() {
  const nameColumn = document.querySelectorAll('#emma-table td:first-child, #emma-table th:first-child');
  let maxWidth = 0;

  // 创建一个隐形的 span 来测量文本宽度
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

  // 适当加点 padding
  maxWidth += 20;

  // 给每个单元格设置固定宽度
  nameColumn.forEach(cell => {
    cell.style.width = `${maxWidth}px`;
    cell.style.minWidth = `${maxWidth}px`;
    cell.style.maxWidth = `${maxWidth}px`;
  });
}

/**
 * 准备各列数值的排名信息，以便给第一名加粗、第二名下划线
 * @param {Array} data 原始数据数组
 * @param {string} section emma 或 emma-mini
 */
function prepareScoresForStyling(data, section) {
  const scores = {};
  // 这里根据你需要的字段列举
  const fields = ['overall', 'math', 'physics', 'chemistry', 'coding'];

  fields.forEach(field => {
    // 提取该字段非空且非 '-' 的数值
    const values = data
      .map(row => row[section] && row[section][field])
      .filter(value => value !== '-' && value !== undefined && value !== null)
      .map(parseFloat);

    if (values.length > 0) {
      // 排序并去重
      const sortedValues = [...new Set(values)].sort((a, b) => b - a);
      // 计算 rank
      scores[field] = data.map(row => {
        const value = row[section] && row[section][field];
        if (value === '-' || value === undefined || value === null) {
          return -1;
        }
        return sortedValues.indexOf(parseFloat(value));
      });
    } else {
      // 如果这个字段都是空，就全部赋值 -1
      scores[field] = data.map(() => -1);
    }
  });

  return scores;
}

/**
 * 根据排名给数值增加样式
 * @param {string|number} value 原始值
 * @param {number} rank 该值的排名（0 为第一名，1 为第二名，其它为普通）
 * @returns {string} 带样式的字符串
 */
function applyStyle(value, rank) {
  if (value === undefined || value === null || value === '-') return '-';
  if (rank === 0) return `<b>${value}</b>`;
  if (rank === 1) return `<span style="text-decoration: underline;">${value}</span>`;
  return `${value}`;
}
