<script lang="ts">
  import { selectedPage, type PageType, isNavbarVisible } from "$lib/store/app/helpers/selectedPage";
  import Listing from "./listing/listing.svelte";
  import Listings from "./listings/listings.svelte";
  import Settings from "./settings/settings.svelte";
  import Navbar from "./navbar/navbar.svelte";
  import DetailsModal from "./listing/detailsModal/detailsModal.svelte";
  import CameraModal from "./listing/cameraModal/cameraModal.svelte";
	import Accounts from "./accounts/accounts.svelte";
	import AddAccountForm from "./accounts/addAccountForm/addAccountForm.svelte";

  let pages = { 'listing': Listing, 'listings': Listings, 'settings': Settings, 'detailsModal': DetailsModal, 'cameraModal': CameraModal, 'accounts': Accounts, 'addAccount': AddAccountForm };
  let page: any;

  $: {
    page = pages[$selectedPage as PageType];
  };

  // Reactive state for swipe functionality
  let startX = 0;
  let currentX = 0;
  const swipeThreshold = 125; // The distance in pixels to trigger a swipe

  function handleTouchStart(event: TouchEvent) {
    startX = event.touches[0].clientX;
  }

  function handleTouchMove(event: TouchEvent) {
    currentX = event.touches[0].clientX;
  }

  // Moved handleTouchEnd out of the reactive block
  function handleTouchEnd() {
    const diffX = startX - currentX;

    // Hide navbar if swiped left far enough
    if ($isNavbarVisible && diffX > swipeThreshold && startX > 30) {
      isNavbarVisible.set(false);
    }
    // Show navbar if swiped right far enough and swipe started from the left edge
    else if (!$isNavbarVisible && diffX < -swipeThreshold && startX > -30 ) {
      isNavbarVisible.set(true);
    }
  }

  // Function to hide the navbar, to be called from the Navbar component
  function hideNavbar() {
    isNavbarVisible.set(false);
  }
</script>

<div
  id="appContainer"
  class:navbar-visible={$isNavbarVisible}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
>
  <section id="navbarWrapper" class="wrapper">
    <Navbar on:hideNavbar={hideNavbar} />
  </section>

  <section id="componentWrapper" class="wrapper">
    <svelte:component this={page} />
  </section>
</div>

<style>
  #appContainer {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: .75rem;
    padding: .75rem;
    background: #3c4965;
    height: calc(100%);
    width: 100dvw;
    color: white;
  }

  .wrapper {
    background: rgba(255, 255, 255, 0.11);
    padding: 1rem;
    box-shadow: inset black 2px 2px 6px;
    height: calc(100%);
  }
  
  #navbarWrapper {
    border-radius: 1rem 0rem 0rem 1rem;
            z-index: 11 !important;
  }
  
  #componentWrapper {
    overflow-y: auto;
    border-radius: 0rem 1rem 1rem 0rem;
    background: linear-gradient(135deg, #3b83f6b5, #2564ebc6);
  }

  @media (max-width: 768px) {
    #appContainer {
      width: 100%;
      height: calc(100% - 0rem);
      overflow: hidden;
      position: relative;
      grid-template-columns: 1fr;
    }

    #navbarWrapper {
      position: absolute;
      border-radius: 0rem 1rem 1rem 0rem;
      height: 100%;
      background: linear-gradient(135deg, #1e1e3b 0%, #0f172a 100%);
      z-index: 10;
      transform: translateX(-100%);
      transition: transform 0.3s ease-in-out;
    }

    #componentWrapper {
          overflow-y: scroll;
    }
    
    #appContainer.navbar-visible #navbarWrapper {
      transform: translateX(0);
    }
  }
</style>
