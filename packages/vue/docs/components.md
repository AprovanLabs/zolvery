<script setup>
import Avatar from '../src/ui/elements/Avatar.vue';
import Dropzone from '../src/ui/elements/Dropzone.vue';
import Hand from '../src/ui/elements/Hand.vue';
import PlayingCard from '../src/ui/elements/PlayingCard.vue';
</script>

# Components

Kossabos Vue components. Import from `@kossabos/vue`

## Misc

### Hand

Manage a hand of items, often playing cards.

<div class="flex flex-col items-center justify-center gap-8">
    <Dropzone component="PlayingCard" label="Flop" :shape="2" :dimensions="['4rem', '6rem']" />
    <Hand
        component="PlayingCard"
        :hand="[
            { rank: '9', suit: 'hearts' },
            { rank: 'K', suit: 'spades' },
            { rank: 'Q', suit: 'diamonds' },
            { rank: 'A', suit: 'clubs' },
        ]"
    />
</div>

### Dropzone

Build customizable zones for dropping items. Often useful for playing cards.
Will set the
[DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations)
`dropEffect` property to `move` when space exists and `none` otherwise.

<div class="flex flex-col gap-8">
    <div class="flex justify-center gap-4">
        <Dropzone component="PlayingCard" label="Flop" :shape="3" :dimensions="['4rem', '6rem']" />
        <Dropzone component="PlayingCard" label="Turn" :shape="1" :dimensions="['4rem', '6rem']" />
        <Dropzone component="PlayingCard" label="River" :shape="1" :dimensions="['4rem', '6rem']" />
    </div>
    <div class="flex justify-center gap-4">
        <PlayingCard draggable suit="hearts" rank="9" />
        <PlayingCard draggable suit="spades" rank="K" />
        <PlayingCard draggable suit="diamonds" rank="Q" />
        <PlayingCard draggable suit="clubs" rank="A" />
    </div>
</div>

### Playing Card

Typical playing cards.

<div class="flex gap-2">
    <PlayingCard suit="hearts" rank="9" />
    <PlayingCard suit="spades" rank="K" />
    <PlayingCard suit="clubs" rank="A" />
    <PlayingCard suit="diamonds" rank="Q" />
</div>

Blank cards showing back. Color can be controlled via `currentColor`.

<div class="flex gap-4">
    <PlayingCard class="text-primary" pattern="striped" hidden />
    <PlayingCard pattern="bordered" hidden />
</div>

### Avatar

Track multiple metrics and display a countdown timer.

<Avatar
    size="xlarge"
    image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
    :countdown="10"
    :primary="{ value: 1, severity: 'danger'}"
    :secondary="{ value: 2, severity: 'info' }"
/>

Mark avatars with decoration.

<div class="flex gap-4">
    <Avatar
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :decoration="{ icon: 'heroicon heroicon-arrow-up' }"
    />
    <Avatar
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :decoration="{ icon: 'heroicon heroicon-star' }"
    />
</div>

Display actions taken by avatars

<div class="flex gap-4">
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value: 'Bid 1', position: 'left' }"
    />
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value: 'Passed Go', timeout: 3 }"
    />
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value:'<span class=\'font-bold white-space-nowrap\'>Bid</span> 6', position: 'bottom' }"
    />
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value: '<span class=\'flex heroicon heroicon-star\'></span>', position: 'right' }"
    />
</div>

## Layout

### Huddle
