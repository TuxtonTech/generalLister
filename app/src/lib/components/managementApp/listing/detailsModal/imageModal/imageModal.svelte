<script lang="ts">
	// Props passed from the gallery component
	export let url: string;

	// Event dispatcher to signal when the modal should close
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
</script>

<div class="modal-backdrop" on:click={() => dispatch('close')}>
	<div class="modal-content">
		<img src={url} alt="Full-size gallery" />
		<button class="close-btn" on:click={() => dispatch('close')}>&times;</button>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		position: relative;
		max-width: 90%;
		max-height: 90%;
	}

	.modal-content img {
		max-width: 100%;
		max-height: 100vh;
		object-fit: contain;
	}

	.close-btn {
		position: absolute;
		top: 10px;
		right: 10px;
		background: none;
		border: none;
		color: white;
		font-size: 2rem;
		cursor: pointer;
	}

    @media (max-width: 768px) { 
        .modal-backdrop {
            width: 100%;
            height: 100%;
        }
    }
</style>