import * as THREE from 'three';
import { globalOffset } from './WorldGenerator.js';
export class WeaponHandler {
    // MAIN
    LEVELHANDLER

    // AMMO
    weaponRemainingAmmo
    defaultRemainingAmmo
	isAttackAvailable

    // MODEL
    weaponModel
    weaponTarget
    weaponPosition
    weaponRotation
	flashlight

	// PARTICLES & JUICE
	hideMuzzleFlash
	fireSprite
	muzzleFire
    
    // SPECS
	weaponIsEquipped
	defaultWeaponIsEquipped
    weaponType
	defaultWeaponType
    destroyedChunkRange
    fireRate
    weaponDamage
    weaponFollowSpeed
    weaponHelpText
	defaultWeaponRange
    weaponRange


    constructor(LEVELHANDLER) {

        this.LEVELHANDLER = LEVELHANDLER;
        
		this.weaponRemainingAmmo = 0;
		this.defaultRemainingAmmo = 0;
		this.isAttackAvailable = true;

		this.isAnimated = false;
		this.weaponIsEquipped = this.defaultWeaponIsEquipped = false;

    }

	// TODO i realize i wrote most of this while high out of my mind but this function chain might be the worst piece of code i've ever written
	// like there are two wholly unnecessary, single-use function calls here for the same exact thing?
	// maybe in a networked game it may be necessary ... maybe it's not so dumb after all ...
	// ill look into it later.

	// This will add the player's weapon model to the scene
	generateWeaponModel(basePath) {
		const LEVELHANDLER = this.LEVELHANDLER;
		const WEAPONHANDLER = this;
		// Initialize with HANDS
		LEVELHANDLER.globalModelLoader.load(
			'../weapons/fists/fists.fbx',
			function (object) {
				object.scale.divideScalar(50);
				WEAPONHANDLER.weaponModel = object;
				LEVELHANDLER.scene.add(WEAPONHANDLER.weaponModel);
				WEAPONHANDLER.weaponModel.material.map = LEVELHANDLER.globalTextureLoader.load('../weapons/fists/fists.png');
				WEAPONHANDLER.weaponModel.rotation.set(Math.PI/2,Math.PI/2,Math.PI/2)
			}
		);
		// Then, load the weapon metadata from the .json file
		if (basePath)
		{
			const jsonLoader = new THREE.FileLoader();
			jsonLoader.load(
				basePath + '.json',
				function (json) {
					const jsonModel = JSON.parse(json);
					LEVELHANDLER.globalModelLoader.load(
						basePath + '.fbx',
						function (object) {
							WEAPONHANDLER.weaponModel.add(object);
							WEAPONHANDLER.weaponIsEquipped = WEAPONHANDLER.defaultWeaponIsEquipped = true;
							// Load in the texture for the weapon
							object.children[0].material.map = LEVELHANDLER.globalTextureLoader.load(basePath + '.png');
							// Adjust the scale from standard magicavoxel scaling
							object.name = jsonModel.weaponData.name;
							// json reads for weapon data
							WEAPONHANDLER.weaponType = WEAPONHANDLER.defaultWeaponType = jsonModel.weaponData.type;
							WEAPONHANDLER.defaultRemainingAmmo = WEAPONHANDLER.weaponRemainingAmmo = document.querySelector("#ammo-counter").textContent = jsonModel.weaponData.totalAmmo;
							WEAPONHANDLER.destroyedChunkRange = jsonModel.weaponData.damageRange;
							WEAPONHANDLER.fireRate = jsonModel.weaponData.fireRate;
							WEAPONHANDLER.weaponDamage = jsonModel.weaponData.weaponDamage;
							WEAPONHANDLER.weaponFollowSpeed = jsonModel.weaponData.followSpeed;
							WEAPONHANDLER.weaponHelpText = jsonModel.weaponData.helpText;
							WEAPONHANDLER.weaponPosition = new THREE.Vector3(jsonModel.weaponData.position.x, jsonModel.weaponData.position.y, jsonModel.weaponData.position.z);
							WEAPONHANDLER.weaponRange = WEAPONHANDLER.defaultWeaponRange = jsonModel.weaponData.minimumDistance;
							WEAPONHANDLER.weaponTarget = new THREE.Mesh(
								new THREE.BoxGeometry(1, 1, 1),
								new THREE.MeshBasicMaterial({ color: 0x00ff00 })
							);

							// FLASHLIGHT

							WEAPONHANDLER.flashlight = new THREE.SpotLight(0xffffff, 250);
							// LEVELHANDLER.camera.add(WEAPONHANDLER.flashlight);
							WEAPONHANDLER.flashlight.rotation.set(-Math.PI/2, 0, 0);

							WEAPONHANDLER.flashlight.castShadow = false;
							WEAPONHANDLER.flashlight.penumbra = 0.5;

							const targetObject = new THREE.Object3D()
							WEAPONHANDLER.flashlight.add(targetObject)
							targetObject.position.set(0,LEVELHANDLER.playerHeight,0)
							WEAPONHANDLER.flashlight.target = targetObject

							WEAPONHANDLER.weaponTarget.material.visible = false; // uncomment to position weapon better
							LEVELHANDLER.camera.add(WEAPONHANDLER.weaponTarget);
							WEAPONHANDLER.weaponTarget.position.copy(WEAPONHANDLER.weaponPosition);
	
							// add a clone of the weaponModel as a child of itself, shifted to the left by 5 units
							// const weaponModelClone = weaponModel.clone();
							// weaponModelClone.scale.multiplyScalar(15);
							// weaponModelClone.position.z -= 865;
							// weaponModel.add(weaponModelClone);
	
							WEAPONHANDLER.weaponRotation = new THREE.Euler(jsonModel.weaponData.rotation.x, jsonModel.weaponData.rotation.y, jsonModel.weaponData.rotation.z);
							WEAPONHANDLER.weaponTarget.rotation.copy(WEAPONHANDLER.weaponRotation);
							// if (WEAPONDATA.weaponHelpText) setHelpText(WEAPONDATA.weaponHelpText);
	
							// Muzzle Flash
							WEAPONHANDLER.hideMuzzleFlash = WEAPONHANDLER.defaultHideMuzzleFlash = true;
							if (jsonModel.weaponData.hasMuzzleFlash == true) {
								const map = new THREE.TextureLoader().load('../img/impact.png');
								WEAPONHANDLER.hideMuzzleFlash = WEAPONHANDLER.defaultHideMuzzleFlash = false;
								WEAPONHANDLER.fireSprite = new THREE.Sprite(new THREE.SpriteMaterial({
									map: map,
									color: 0xffffff,
									side: THREE.DoubleSide,
									depthTest: false,
									transparent: true,
								}));
								object.add(WEAPONHANDLER.fireSprite);
								WEAPONHANDLER.fireSprite.position.x = 50;
								WEAPONHANDLER.fireSprite.position.y = 250;
								WEAPONHANDLER.fireSprite.position.z = -700;
		
								// Muzzle Fire
								WEAPONHANDLER.muzzleFire = new THREE.Mesh(
									new THREE.PlaneGeometry(6000, 45),
									new THREE.MeshBasicMaterial({
										map: new THREE.TextureLoader().load('../img/muzzlefire.png'),
										color: 0xffffff,
										side: THREE.DoubleSide,
										depthTest: false,
										transparent: true,
									})
								);
								object.add(WEAPONHANDLER.muzzleFire);
								WEAPONHANDLER.muzzleFire.position.x = 50;
								WEAPONHANDLER.muzzleFire.position.y = 250;
								WEAPONHANDLER.muzzleFire.position.z = -3600;
								WEAPONHANDLER.muzzleFire.rotation.y = Math.PI / 2;
							}
						},
						function (err) {
							// console.log(err);
						}
					);
				}
			);
		}
    }

	createWeaponPickup(weaponType, position) {
        const LEVELHANDLER = this.LEVELHANDLER;
		
		const weaponURL = '../weapons/' + weaponType + '/' + weaponType;

		LEVELHANDLER.globalModelLoader.load(
			weaponURL + '.fbx',
			function (object) {
				LEVELHANDLER.scene.add(object);
				LEVELHANDLER.weaponPickups.push(object);
				object.isActive = true;
				object.position.set(position.x, position.y+1, position.z);
				object.position.add(globalOffset);
				object.scale.divideScalar(50);
				object.rotation.set(0, Math.random(), Math.PI/2)
			}
		);
	}

	setWeaponVisible(toggle) {
		this.weaponModel.children[0].visible = toggle;
	}

	throwWeapon(voxelField) { return
		if (this.weaponIsEquipped)
		{
			this.weaponIsEquipped = false;
			// Raycast and throw it!!
			const cameraDir = new THREE.Vector3(0, 0, 0);
			this.LEVELHANDLER.camera.getWorldDirection(cameraDir);
			const intersect = voxelField.raycast(this.LEVELHANDLER.camera.position, cameraDir, 1000);
	
			// Generate a Weapon Clone
			const weaponClone = this.weaponModel.clone();
			weaponClone.remove(weaponClone.children[3]);
			this.setWeaponVisible(false);
			weaponClone.children[0].material = this.weaponModel.children[0].material.clone();
			weaponClone.position.copy(this.LEVELHANDLER.camera.position);
			weaponClone.rotation.set(0, 0, 0);
			this.LEVELHANDLER.addThrownWeapon(weaponClone);
			const intersectPosition = new THREE.Vector3(0,0,0);
			if (intersect != null) {
				intersectPosition.set(intersect.x, intersect.y, intersect.z);
			}
			else
			{
				intersectPosition.set(this.LEVELHANDLER.camera.position.x + cameraDir.x * 500, this.LEVELHANDLER.camera.position.y + cameraDir.y * 500, this.LEVELHANDLER.camera.position.z + cameraDir.z * 500);
			}
			// Raycast for Enemies
			const raycaster = new THREE.Raycaster();
			raycaster.setFromCamera(new THREE.Vector2(0, 0), this.LEVELHANDLER.camera);
			const intersects = raycaster.intersectObjects(this.LEVELHANDLER.NPCBank.map(npc => npc.sceneObject.children[0]));
			intersects.forEach((intersect) => {
				if (intersect.distance > this.LEVELHANDLER.camera.position.distanceTo(intersectPosition)) return;
				intersect.object.npcHandler.depleteHealth(100);
			});
			// Prevent Shooting
			this.weaponRemainingAmmo = 0;
			// Lastly, fire the interval ...
			let n;
			let reached = false;
			n = setInterval(() => {
				weaponClone.position.lerp(intersectPosition, 0.05);
				weaponClone.rotation.y += 0.025;
				weaponClone.rotation.x += 0.025;
				weaponClone.rotation.z += 0.025;
				if (weaponClone.position.distanceTo(intersectPosition) < 5) {
					weaponClone.scale.multiplyScalar(0.85);
					if (reached == false)
					{
						reached = true;
						setTimeout(() => {
							this.LEVELHANDLER.scene.remove(weaponClone);
							clearInterval(n);
						}, 10000);
					}
				}
			}, 10);
	
			this.weaponType = "melee";
			this.weaponRange = 50;
			this.hideMuzzleFlash = true;
		}
	}


}