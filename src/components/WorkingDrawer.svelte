<script lang="ts">
  import { Minus } from "@lucide/svelte";
  import { setContext } from "svelte";
  import { Drawer } from "vaul-svelte";

  let { children, snapValue } = $props();
  let activeSnapPoint = $state(snapValue);
  setContext("setDrawerValue", (value: string | number) => {
    console.log("SET DRAWER VALUE");
    if (activeSnapPoint !== value) {
      activeSnapPoint = value;
    }
  });
  $inspect(activeSnapPoint);
</script>

<!-- class={clsx("flex flex-col max-w-md mx-auto w-full p-4 pt-5", {
						"overflow-y-auto": activeSnapPoint === 1,
						"overflow-hidden": activeSnapPoint !== 1,
					})} -->

<Drawer.Root
  snapPoints={["88px", "400px", 1]}
  bind:activeSnapPoint
  open={true}
  dismissible={false}
  modal={false}
>
  <!-- <Drawer.Trigger>Open</Drawer.Trigger> -->
  <!-- <Drawer.Overlay class="fixed inset-0 bg-black/40" /> -->
  <Drawer.Portal>
    <Drawer.Content
      class="overscroll-none fixed bottom-0 inset-x-0 h-full w-full max-h-[97%] flex flex-col bg-stone-50 dark:bg-gray-900 border-white dark:border-gray-700 border-2 border-b-none rounded-t-[10px] px-2"
    >
      <span class="items-center justify-center">
        <Minus
          class="text-gray-400 dark:text-gray-600 mx-auto -mt-5.5 -mb-4.5"
          size={48}
        />
      </span>
      {@render children()}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>

<!-- <Drawer.Root>
  <Drawer.Trigger>Open</Drawer.Trigger>
  <Drawer.Content>
    <Drawer.Header>
      <Drawer.Title>Are you sure absolutely sure?</Drawer.Title>
      <Drawer.Description>This action cannot be undone.</Drawer.Description>
    </Drawer.Header>
    {@render children()}
    <Drawer.Footer>
      <Button>Submit</Button>
      <Drawer.Close>Cancel</Drawer.Close>
    </Drawer.Footer>
  </Drawer.Content>
</Drawer.Root> -->
