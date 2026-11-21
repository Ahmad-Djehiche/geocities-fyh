# Webstreet
A GeoCities-inspired pixel-art neighbourhood where every house is someone's homepage.

[Live demo](https://ahmad-djehiche.github.io/geocities-fyh/) · [GitHub repository](https://github.com/Ahmad-Djehiche/geocities-fyh)

## Inspiration
For the Old Tech, New Tricks track, we wanted to bring back the feeling of being able to explore the web using a fun method inspired by GeoCities, which grouped homepages into neighbourhoods. We took this idea and built our modern version, with a growing street that you can walk down and go door to door visiting your friend's homepages.

## What we built
Using either WASD or the arrow keys, you can walk through the neighbourhood. The E key can be used to interact with your neighbour's house and view their homepage. With an account, you can choose a vacant plot, pick a house colour and add links to your personal website and GitHub profile. You can send friend requests by username, and once they are on your street you can walk to their mailbox to send a private letter via a flying pixel-art pig.

The street starts with four plots and grows as more friends are made and more houses are built. When two players choose the same plot, the database assigns the second house to the next vacant plot.

## How we built it
We used React and Vite for the browser game, Supabase for authentication and shared data, and GitHub Actions and GitHub Pages to build and publish the site. The app also has a local preview that saves a custom house in the browser, so you can explore without configuring Supabase.

The street’s house sprite is from CraftPix’s Main Characters Home Free Top-Down Pixel Art pack.
