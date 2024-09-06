export class AudioController {
    private successSound: HTMLAudioElement;
    private milestoneSound: HTMLAudioElement;

    constructor() {
        this.successSound = new Audio('/assets/sounds/pop_sound.mp3');
        this.milestoneSound = new Audio('path/to/milestone-sound.mp3');
    }

    playSuccessSound() {
        this.successSound.play();
    }

    playMilestoneSound() {
        this.milestoneSound.play();
    }
}