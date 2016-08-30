/*
 *  This file is part of Moeditor.
 *
 *  Copyright (c) 2016 Menci <huanghaorui301@gmail.com>
 *
 *  Moeditor is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Moeditor is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Moeditor. If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

require('electron-titlebar');

document.addEventListener('DOMContentLoaded', () => {
    window.localized.push(() => {
        const selectLocale = document.querySelector('select[data-key=locale]');
        const languages = moeApp.locale.getLanguages();
        for (let lang in languages) {
            let option = document.createElement('option');
            option.value = lang;
            option.text = languages[lang];
            selectLocale.appendChild(option);
            console.log(moeApp.locale.sysLocale);
            if (lang === moeApp.locale.sysLocale) {
                selectLocale.firstElementChild.text += ' - ' + languages[lang];
            }
        }
        const oldVal = moeApp.config.get('locale');
        selectLocale.value = oldVal;
        selectLocale.addEventListener('change', () => {
            moeApp.locale.setLocale(selectLocale.value);
            window.localized.push(() => {
                const languages = moeApp.locale.getLanguages();
                for (let lang in languages) {
                    selectLocale.querySelector('[value="' + lang + '"]').text = languages[lang];
                    if (lang === moeApp.locale.sysLocale) {
                        selectLocale.firstElementChild.text += ' - ' + languages[lang];
                    }
                }
            });
        });
    });

    // Save settings and send messages
    const ipcRenderer = require('electron').ipcRenderer;

    const items = document.getElementsByClassName('settings-item');
    for (const item of items) {
        const key = item.getAttribute('data-key');
        const oldVal = moeApp.config.get(key);
        if (item.tagName === 'SELECT' || item.tagName === 'INPUT' || item.tagName === 'TEXTAREA') {
            if (item.tagName === 'INPUT' && item.type === 'checkbox') item.checked = oldVal;
            else item.value = oldVal;
            item.addEventListener('change', () => {
                let val;
                if (item.tagName === 'INPUT' && item.type === 'checkbox') val = item.checked;
                else val = item.value;
                console.log(key + ': ' + val);
                moeApp.config.set(key, val);
                ipcRenderer.send('setting-changed', { key: key, val: val });
            });
        }
    }

    // Custom render themes
    let renderThemeSelect = document.querySelector('select[data-key="render-theme"]');
    function reloadRenderThemeSelect() {
        renderThemeSelect.querySelectorAll('option:not(.builtin)').forEach((a) => renderThemeSelect.removeChild(a));
        const custom = moeApp.config.get('custom-render-themes');
        for (const x in custom) {
            const option = document.createElement('option');
            option.value = option.text = x;
            renderThemeSelect.appendChild(option);
        }
        renderThemeSelect.value = moeApp.config.get('render-theme');
    }
    let renderThemeButtonAdd = document.querySelector('select[data-key="render-theme"] ~ button.button-add');
    let renderThemeButtonRemove = document.querySelector('select[data-key="render-theme"] ~ button.button-remove');
    function setRenderThemeButtons() {
        if (renderThemeSelect.selectedOptions[0].classList.contains('builtin')) {
            renderThemeButtonRemove.setAttribute('disabled', null);
        } else {
            renderThemeButtonRemove.removeAttribute('disabled');
        }
    }
    setRenderThemeButtons();
    renderThemeSelect.addEventListener('change', setRenderThemeButtons);
    const dialog = require('electron').remote.dialog;
    renderThemeButtonAdd.addEventListener('click', () => {
        dialog.showOpenDialog(window.w, { properties: ['openDirectory', 'multiSelections'] }, (fileNames) => {
            if (!fileNames || fileNames.length === 0) return;
            const a = fileNames.filter((s) => {
                try {
                    return fs.readdirSync(s).includes('style.css');
                } catch (e) {
                    return false;
                }
            });
            let themes = JSON.parse(JSON.stringify(moeApp.config.get('custom-render-themes')));
            for (const s of a) themes[path.basename(s)] = s;
            moeApp.config.set('custom-render-themes', themes);
            console.log(themes);
            reloadRenderThemeSelect();
        });
    });
    renderThemeButtonRemove.addEventListener('click', () => {
        let option = renderThemeSelect.selectedOptions[0];
        if (!option || option.classList.contains('builtin')) return;
        let themes = JSON.parse(JSON.stringify(moeApp.config.get('custom-render-themes')));
        themes[option.value] = undefined;
        moeApp.config.set('custom-render-themes', themes);
        reloadRenderThemeSelect();

        // Reset to default
        moeApp.config.set('render-theme', 'GitHub');
        renderThemeSelect.value = 'GitHub';

        let e = document.createEvent('HTMLEvents');
        e.initEvent('change', false, true);
        renderThemeSelect.dispatchEvent(e);
    });
});
