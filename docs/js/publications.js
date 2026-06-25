const initPublications = () => {
    const btnAll = document.getElementById('toggle-all');
    const btnSelected = document.getElementById('toggle-selected');

    if (!btnAll || !btnSelected) return;

    function showAll() {
        document.querySelectorAll('li.pub-item').forEach(item => { item.style.display = ''; });
        document.querySelectorAll('h2').forEach(h2 => {
            h2.style.display = '';
            const ul = h2.nextElementSibling;
            if (ul && ul.tagName === 'UL') ul.style.display = '';
        });
        btnAll.classList.add('active');
        btnSelected.classList.remove('active');
    }

    function showSelected() {
        document.querySelectorAll('li.pub-item').forEach(item => {
            item.style.display = item.dataset.selected === 'true' ? '' : 'none';
        });
        document.querySelectorAll('h2').forEach(h2 => {
            const ul = h2.nextElementSibling;
            if (ul && ul.tagName === 'UL') {
                const hasVisible = [...ul.querySelectorAll('li.pub-item')]
                    .some(li => li.dataset.selected === 'true');
                h2.style.display = hasVisible ? '' : 'none';
                ul.style.display = hasVisible ? '' : 'none';
            }
        });
        btnSelected.classList.add('active');
        btnAll.classList.remove('active');
    }

    btnAll.addEventListener('click', showAll);
    btnSelected.addEventListener('click', showSelected);
    showSelected();
};

document.addEventListener('DOMContentLoaded', initPublications);
