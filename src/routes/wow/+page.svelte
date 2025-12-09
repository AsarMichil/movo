<script lang="ts">
 import MinusIcon from "@lucide/svelte/icons/minus";
 import PlusIcon from "@lucide/svelte/icons/plus";
 import * as Drawer from "$lib/components/ui/drawer/index.js";
 import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
    import Silly from "../../components/WorkingDrawer.svelte";
 
</script>

<!-- <Drawer.Root>
	<Drawer.Trigger onclick={()=>{console.log("clicked")}}>Open</Drawer.Trigger>
	<Drawer.Portal>
		<Drawer.Content>
			<p>Content</p>
		</Drawer.Content>
		<Drawer.Overlay />
	</Drawer.Portal>
</Drawer.Root> -->


<!-- <Silly/> -->


<!-- <Drawer.Root>
 <Drawer.Trigger class={buttonVariants({ variant: "outline" })}
  >Open Drawer</Drawer.Trigger
 >
 <Drawer.Content>
  <div class="mx-auto w-full max-w-sm">
   <Drawer.Header>
    <Drawer.Title>Move Goal</Drawer.Title>
    <Drawer.Description>Set your daily activity goal.</Drawer.Description>
   </Drawer.Header>
   <div class="p-4 pb-0">
    <div class="flex items-center justify-center space-x-2">
     <Button
      variant="outline"
      size="icon"
      class="size-8 shrink-0 rounded-full"
     >
      <MinusIcon />
      <span class="sr-only">Decrease</span>
     </Button>
     <div class="flex-1 text-center">
      <div class="text-7xl font-bold tracking-tighter">

      </div>
      <div class="text-muted-foreground text-[0.70rem] uppercase">
       Calories/day
      </div>
     </div>
     <Button
      variant="outline"
      size="icon"
      class="size-8 shrink-0 rounded-full"
     >
      <PlusIcon />
      <span class="sr-only">Increase</span>
     </Button>
    </div>
    <div class="mt-3 h-[120px]">
     <div class="h-full w-full">
      
     </div>
    </div>
   </div>
   <Drawer.Footer>
    <Button>Submit</Button>
    <Drawer.Close class={buttonVariants({ variant: "outline" })}
     >Cancel</Drawer.Close
    >
   </Drawer.Footer>
  </div>
 </Drawer.Content>
</Drawer.Root> -->

