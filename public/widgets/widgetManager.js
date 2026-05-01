(function(){
  function createKPIWidget(){
    const card = document.createElement('div');
    card.style.border = '1px solid var(--border)';
    card.style.borderRadius = '12px';
    card.style.background = 'var(--bg-card)';
    card.style.padding = '12px';
    card.style.width = 'calc(33% - 8px)';
    card.style.display = 'inline-block';
    card.style.margin = '4px';
    card.innerHTML = `
      <div style="font-weight:700; color:var(--text);">KPIs</div>
      <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap;">
        <div style="flex:1; min-width:120px;">Device: <b>12</b></div>
        <div style="flex:1; min-width:120px;">Online: <b>9</b></div>
        <div style="flex:1; min-width:120px;">Crops: <b>7</b></div>
      </div>`;
    return card;
  }

  function createChartWidget(){
    const wrap = document.createElement('div');
    wrap.style.border = '1px solid var(--border)';
    wrap.style.borderRadius = '12px';
    wrap.style.background = 'var(--bg-card)';
    wrap.style.padding = '12px';
    wrap.style.display = 'inline-block';
    wrap.style.width = '66%';
    wrap.style.margin = '4px';
    const canvas = document.createElement('canvas');
    canvas.id = 'sampleChart';
    wrap.appendChild(canvas);
    // simple chart data
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{ label: 'Revenue', data: [12,19,3,5,2,3], borderColor: '#34d399', fill: false }] 
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return wrap;
  }

  function createListWidget(){
    const wrap = document.createElement('div');
    wrap.style.border = '1px solid var(--border)';
    wrap.style.borderRadius = '12px';
    wrap.style.background = 'var(--bg-card)';
    wrap.style.padding = '12px';
    wrap.style.display = 'block';
    wrap.style.width = '100%';
    wrap.style.margin = '4px 0';
    const ul = document.createElement('ul');
    ul.style.paddingLeft = '18px';
    ['Sử dụng dữ liệu thực','Cập nhật trạng thái cảm biến','Cảnh báo mới','Đã xử lý'].forEach((t)=>{
      const li = document.createElement('li'); li.textContent = t; ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function render(container){
    const area = container || document.body;
    const kpi = createKPIWidget();
    const chart = createChartWidget();
    const list = createListWidget();
    // Ensure a wrapper div for widgets
    const wrapper = document.createElement('div');
    wrapper.id = 'widget-area';
    wrapper.style.display = 'flex';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.marginTop = '12px';
    wrapper.appendChild(kpi);
    wrapper.appendChild(chart);
    wrapper.appendChild(list);
    area.appendChild(wrapper);
  }

  document.addEventListener('DOMContentLoaded', function(){
    // If there is an existing dashboard container, mount widgets there; otherwise add to body
    const container = document.getElementById('widget-area') || document.body;
    render(container);
  });
})();
