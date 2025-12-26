// ScreenManager.js
export class ScreenManager {
    constructor() {
        this.screens = {
            'title': document.getElementById('title-screen'),
            'settings-ai': document.getElementById('settings-ai-screen'),
            'settings-two-player': document.getElementById('settings-two-player-screen'),
            'game': document.getElementById('game-screen')
        };
        this.currentScreenId = 'title';
    }

    /**
     * 指定された画面IDに切り替える
     */
    show(screenId) {
        if (!this.screens[screenId]) {
            console.error(`Screen ID "${screenId}" not found.`);
            return;
        }

        // 現在の画面を非表示にする
        this.screens[this.currentScreenId].classList.add('hidden');
        
        // 新しい画面を表示する
        this.screens[screenId].classList.remove('hidden');
        this.currentScreenId = screenId;
    }
}

