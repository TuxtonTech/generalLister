<script>
    export let data;
</script>

<h1>Environment Test</h1>
<p>Public env keys: {JSON.stringify(data.publicKeys)}</p>
<p>Private env keys: {JSON.stringify(data.privateKeys)}</p>
<p>Direct access to PUBLIC_TEST: {data.directAccess}</p>