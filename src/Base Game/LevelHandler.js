import * as THREE from 'three';
import { voxelField, generateDestroyedChunkAt } from './VoxelStructures.js'; // data structures for handling voxels
import { globalOffset } from './WorldGenerator.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { rapidFloat } from './EngineMath.js'; // math functions
import { SoundEffectPlayer } from './AudioLibrary.js'; // SFX and Music

// Data relevant to the user's graphics and gameplay settings
export const USERSETTINGS = {};

// Data relevent to the game's currently loaded level
export class LevelHandler {
	// Data about Renderer
	scene
	camera
	weaponCamera
	renderer
	potentialCleanCalls
	outliner

	// Data about Audio
	SFXPlayer
	MusicPlayer

	// Data about World
	gameStateEnded
	interactableObjects
	weaponPickups
	healthPickups
	numCoverBoxes
	numVoxels
	timeModifier
	particleHandler
	backlight
	worldSphere
	defaultBacklightColor
	nextLevelURL
	isLevelComplete
	levelFinishedLoading
	isCameraShaking
	levelLights
	nextLevelText
	levelID
	explosives
	levelIsPaused

	// Data about Elevator
	elevatorText
	elevatorLoadingText
	elevatorDoorRight
	elevatorDoorLeft
	elevatorHasOpened

	// Data about Player
	playerHeight
	playerHealth
	playerCanMove
	lastPlayerKiller
	hasKilledYet
	lastKiller
	controls
	deathCount
	timers

	// Data about Player Challenges
	hasBeenShot
	hasShotYet

	// Data about WorldBuilding
	globalTextureLoader
	globalModelLoader
	numExplosivesProcessed
	numExplosives

	// Data about NPCs
	NPCBank
	totalNPCs
	killBlobs

	// Data about Weapons
	WEAPONHANDLER
	thrownWeaponBank

	constructor(scene, camera) {
		this.scene = scene;
		this.camera = camera;
		this.camera.nextEuler = new THREE.Euler(0, 0, 0, 'XYZ');
		this.renderer = new THREE.WebGLRenderer({ /* antialias: true */ });

		this.potentialCleanCalls = 0;

		this.SFXPlayer = new SoundEffectPlayer(USERSETTINGS);

		this.interactableObjects = [];
		this.gameStateEnded = false;
		this.weaponPickups = [];
		this.healthPickups = [];
		this.numCoverBoxes = 0;
		this.numVoxels = 0;
		this.timeModifier = 1;
		this.isLevelComplete = this.levelFinishedLoading = false;
		this.levelLights = [];
		this.explosives = [];
		this.levelIsPaused = false;
		
		this.playerHeight = 30;
		this.playerHealth = 100;
		this.playerCanMove = true;
		this.lastKiller = [];
		this.deathCount = 0;
		this.hasKilledYet = false;

		this.isCameraShaking = false;

		this.globalTextureLoader = new THREE.TextureLoader()
		this.globalModelLoader = new FBXLoader();

		this.NPCBank = [];
		this.totalNPCs = 0;
		this.totalKillableNPCs = 0;
		this.killBlobs =[];
		
		this.timers = [];

		this.hasBeenShot = false;
		this.hasShotYet = false;
	}

	rebuildAudioPlayer() {
		const energy = this.SFXPlayer.musicEnergy;
		this.SFXPlayer.stopMusicPlayback();
		this.SFXPlayer = new SoundEffectPlayer(USERSETTINGS);
		console.log("Rebuilt Audio Player");
		this.SFXPlayer.shiftEnergy(energy);
		const musicID = this.SFXPlayer.SelectMusicID(this.levelID);
		if (musicID != -1) this.SFXPlayer.startMusicPlayback(musicID, energy);
	}

	registerExplosive(explosive) {
		const blocksToDestroy = [];
		const explosiveRadius = 35;
		for (let x = explosive.position.x - explosiveRadius; x < explosive.position.x + explosiveRadius; x++) {
			for (let y = explosive.position.y - explosiveRadius; y < explosive.position.y + explosiveRadius; y++) {
				for (let z = explosive.position.z - explosiveRadius; z < explosive.position.z + explosiveRadius; z++) {
					if (y < 3) continue;
					const block = voxelField.get(x, y, z);
					if (block != null) {
						if (x == explosive.position.x - explosiveRadius || x == explosive.position.x + explosiveRadius - 1 || y == explosive.position.y - explosiveRadius || y == explosive.position.y + explosiveRadius - 1 || z == explosive.position.z - explosiveRadius || z == explosive.position.z + explosiveRadius - 1)
						{
							if (rapidFloat() < 0.5) continue;
						}
						blocksToDestroy.push(block.position);
						voxelField.set(x,y,z, 2, block.indexInChunk, block.chunk);
					}
				}
			}
		}
		explosive.children[0].blocksToDestroy = blocksToDestroy;
		explosive.explosiveRadius = explosiveRadius;

		this.explosives.push(explosive);
	}

	triggerExplosive(explosive) {
		if (explosive.parent.visible) {
			const explosiveRangeMultiplier = 3;
			// process explosive's blocks destroyed
			const blocksToDestroy = explosive.blocksToDestroy;
			generateDestroyedChunkAt(blocksToDestroy, USERSETTINGS, this, null, explosive);
			// kill nearby NPC's
			this.NPCBank.forEach(npc => {
				if (npc.sceneObject.position.distanceTo(explosive.parent.position) < explosive.parent.explosiveRadius * explosiveRangeMultiplier) {
					npc.depleteHealth(100);
				}
			});
			// trigger explosion effect
			const explosion = explosive.parent.explosion;
			explosion.visible = true;
			let n;
			n = setInterval(() => {
				explosion.scale.multiplyScalar(1.2);
				explosion.children[0].material.forEach(mat => {mat.opacity -= 0.02});
				if (explosive.parent.visible == true) {
					clearInterval(n);
					explosion.visible = false;
					explosion.scale.set(1/1000, 1/1000, 1/1000);
					explosion.children[0].material.forEach(mat => {mat.opacity = 0.5});
				}
			}, 10);
			// Sound
			this.SFXPlayer.playSound("blastSound", true);
			// cleanup //
			explosive.parent.visible = false;
			this.isCameraShaking = true;
			setTimeout(() => {this.isCameraShaking = false;}, 150);
		}
	}

	computeNPCBlobs() {
		this.NPCBank.forEach(npc => {
			npc.computeBlob();
		});
	}

	freezeTimer() {
		this.timers.forEach(timer => clearInterval(timer));
		document.querySelector("#timer").classList.add("done");
	}

	initializeTimer() {
		this.freezeTimer();
		document.querySelector("#timer").classList.remove("done");
		const timerSeconds = document.querySelector("#timer-seconds");
		const timerCentiseconds = document.querySelector("#timer-centiseconds");
		timerSeconds.textContent = "0";
		timerCentiseconds.textContent = "00";
		// update seconds
		this.timers.push(setInterval(() => {
			if (this.playerHealth > 0 && !this.levelIsPaused) {
				timerSeconds.textContent = parseInt(timerSeconds.textContent) + 1;
			}
		}, 1000));
		// update centiseconds
		this.timers.push(setInterval(() => {
			if (this.playerHealth > 0 && !this.levelIsPaused) {

				timerCentiseconds.textContent = parseInt(timerCentiseconds.textContent) + 1;
				// if it is single-digit centiseconds, add a leading zero
				if (parseInt(timerCentiseconds.textContent) < 10) {
					timerCentiseconds.textContent = "0" + parseInt(timerCentiseconds.textContent);
				}
				if (parseInt(timerCentiseconds.textContent) > 99) {
					timerCentiseconds.textContent = "00";
				}
			}
		}, 10));
	}

	createHealthPickup(position) {
		// import fbx ../pickups/healthpack.fbx
		this.globalModelLoader.load("../pickups/healthpack.fbx", (model) => {
			model.position.copy(position);
			this.scene.add(model);
			setInterval(() => {
				model.rotation.y += 0.01;
			}, 5);
			model.position.y += 5;
			model.scale.multiplyScalar(0.025);
			model.children[0].material = new THREE.MeshBasicMaterial({
				color: 0x00FF00,
				emissive: true,
				emissiveIntensity: 2
			})
			model.isActive = true;
			model.position.add(globalOffset)
			this.healthPickups.push(model);
		});
	}

	goToNextLevel() {
		this.SFXPlayer.playSound("endLevelSound", false);
		this.isCameraShaking = true;
		setTimeout(() => {this.isCameraShaking = false}, 150);
		this.isLevelComplete = false;
		document.querySelector("#cover-flash").style.animation = "expand 0.75s";
		document.querySelector("#end-screen").style.display = document.querySelector("#ui-overlay").style.display = "none";
		setTimeout(() => {
			let target = "index.html?mapName=" + this.nextLevelURL;
			if (this.nextLevelURL.substring(0, 3) == "../") target = this.nextLevelURL;
			window.location.href = target;
		}, 500);
		this.renderer.domElement.style.animation = "shrink 0.75s ease-in-out forwards";
	}
}

export const instancedModelIndex = []; // index of raw voxel instances and cover boxes