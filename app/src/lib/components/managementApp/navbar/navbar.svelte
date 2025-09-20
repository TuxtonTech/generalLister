<script lang="ts">
    import { isNavbarVisible, selectedPage } from "$lib/store/app/helpers/selectedPage";
    import { createEventDispatcher } from 'svelte';
    // Create an event dispatcher
    const dispatch = createEventDispatcher();

    // A function to handle navigation and dispatch an event
    function navigateAndClose(pageName: string) {
        // 1. Navigate to the selected page
        
        selectedPage.set(pageName);
        isNavbarVisible.set(false);
        // 2. Dispatch a custom event to tell the parent to close the navbar
        // dispatch('navClick');
    }
</script>

<div id="navbar">
    <div>
        <img src="https://tuxtontech.com/assets/imgs/egeus.png" alt="Logo">
        <button on:click={() => navigateAndClose('listing')}>Sell</button>
        <button on:click={() => navigateAndClose('listings')}>Listings</button>
        <button on:click={() => navigateAndClose('accounts')}>Accounts</button>
    </div>
    <div>
        <button on:click={() => window.location.href = '/dashboard'}>Dashboard</button>
        <button on:click={() => navigateAndClose('settings')}>Settings</button>
    </div>
</div>

<style>
    #navbar {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        height: 100%;
    }

    #navbar div {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: larger;
        font-weight: 400;
        font-style: normal;
        margin: 1rem;
    }

</style>