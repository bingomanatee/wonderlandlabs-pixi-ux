import type {Meta, StoryObj} from '@storybook/html';
import {Application, Color} from 'pixi.js';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import {ButtonStore} from './ButtonStore.js';
import defaultStyles from './defaultStyles.json' with {type: 'json'};

const PLACEHOLDER_ICON = '/placeholder-art.png';
const STORY_BACKGROUND = new Color('#f6f1e7').toNumber();

function color(value: string | number): number {
    return new Color(value).toNumber();
}

function createStoryStyleTree() {
    const tree = fromJSON(defaultStyles);

    tree.set('container.background.color', ['text'], undefined);
    tree.set('container.border.width', ['text'], 0);
    tree.set('container.content.gap', ['text'], 8);

    tree.set('container.background.width', ['button'], 180);
    tree.set('container.background.height', ['button'], 48);
    tree.set('container.background.width', ['text'], 180);
    tree.set('container.background.height', ['text'], 40);
    tree.set('container.background.width', ['icon-vert'], 110);
    tree.set('container.background.height', ['icon-vert'], 120);
    tree.set('container.background.width', ['avatar'], 72);
    tree.set('container.background.height', ['avatar'], 72);

    tree.set('container.content.gap', ['button'], 10);
    tree.set('container.content.gap', ['icon-vert'], 8);

    tree.set('container.background.color', ['hover'], color('#EAF4FF'));
    tree.set('container.border.color', ['hover'], color('#3B82F6'));
    tree.set('container.border.width', ['hover'], 1);

    return tree;
}

function showAlert(message: string) {
    return () => {
        window.alert(message);
    };
}

type Story = StoryObj;

const meta: Meta = {
    title: 'Button/Click Alerts',
};

export default meta;

export const AlertButtons: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '320px';
        void (async () => {
            const app = new Application();
            await app.init({
                width: 900,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: 'button',
                    label: 'Primary Button',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 220, height: 52},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Primary button clicked')},
                }),
                new ButtonStore({
                    variant: 'text',
                    label: 'Text Link Button',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 300, y: 46, width: 220, height: 40},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Text button clicked')},
                }),
                new ButtonStore({
                    variant: 'icon-vert',
                    label: 'Profile',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 560, y: 24, width: 120, height: 128},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Vertical icon button clicked')},
                }),
                new ButtonStore({
                    variant: 'avatar',
                    label: 'AB',
                    size: {x: 720, y: 40, width: 72, height: 72},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Avatar button clicked')},
                }),
            ];

            buttons.forEach((button) => {
                app.stage.addChild(button.container);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};

export const AlertStates: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '320px';
        void (async () => {
            const app = new Application();
            await app.init({
                width: 900,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: 'button',
                    label: 'Enabled',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 190, height: 52},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Enabled button clicked')},
                }),
                new ButtonStore({
                    variant: 'button',
                    label: 'Disabled',
                    icon: PLACEHOLDER_ICON,
                    isDisabled: true,
                    size: {x: 260, y: 40, width: 190, height: 52},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('This should not fire')},
                }),
                new ButtonStore({
                    variant: 'text',
                    label: 'Hover Me',
                    size: {x: 500, y: 46, width: 160, height: 40},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Hover state button clicked')},
                }),
                new ButtonStore({
                    variant: 'avatar',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 720, y: 30, width: 88, height: 88},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Avatar icon button clicked')},
                }),
            ];

            buttons.forEach((button) => {
                app.stage.addChild(button.container);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};

export const SubmitFlow: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '240px';
        void (async () => {
            const app = new Application();
            await app.init({
                width: 900,
                height: 240,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const submitButton = new ButtonStore({
                variant: 'button',
                label: 'Submit',
                icon: PLACEHOLDER_ICON,
                size: {x: 40, y: 48, width: 220, height: 52},
            }, {
                app,
                styleTree,
                handlers: {
                    click: () => {
                        submitButton.set('isDisabled', true);
                        submitButton.set('label', 'Submitting...');

                        window.setTimeout(() => {
                            submitButton.set('isDisabled', false);
                            submitButton.set('label', 'Submit');
                            window.alert('Submit finished');
                        }, 2000);
                    },
                },
            });

            const disabledHint = new ButtonStore({
                variant: 'text',
                label: 'Click Submit to see the temporary disabled state.',
                size: {x: 300, y: 54, width: 420, height: 36},
            }, {
                app,
                styleTree,
                handlers: {
                    click: showAlert('This helper text is also clickable'),
                },
            });

            [submitButton, disabledHint].forEach((button) => {
                app.stage.addChild(button.container);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};
