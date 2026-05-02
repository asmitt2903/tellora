import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Story from './models/storyModel.js';
import dbConnect from './config/dbConnect.js';

dotenv.config();

const AUTHOR_ID = "69f5ab06fafbe7128e55fc3c";

const stories = [
    {
        author: AUTHOR_ID,
        title: "The Alchemist of Shadows",
        description: "In a world where light is a currency, one young boy discovers the forbidden art of shadow-casting.",
        genre: "Fantasy",
        status: "published",
        views: 1250,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "Neon Pulse: 2099",
        description: "A detective in a cyberpunk metropolis tracks a killer who only exists in the digital subconscious.",
        genre: "Science Fiction",
        status: "published",
        views: 890,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "Whispers of the Old Oak",
        description: "An ancient tree in the heart of a modern city begins to talk to a lonely librarian.",
        genre: "Mystery",
        status: "published",
        views: 2100,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "The Midnight Library",
        description: "Every book in this library contains a life you could have lived. Which one will you choose?",
        genre: "Fantasy",
        status: "published",
        views: 5400,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "Stardust & Sea Salt",
        description: "A romance that transcends the boundaries of the ocean and the stars.",
        genre: "Romance",
        status: "published",
        views: 3200,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "The Clockwork Heart",
        description: "A girl born with a mechanical heart seeks to find the man who wound her up.",
        genre: "Adventure",
        status: "published",
        views: 1500,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "Echoes of Eternity",
        description: "When the last star fades, humanity must find a way to live in the dark.",
        genre: "Science Fiction",
        status: "published",
        views: 4300,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "The Silent Witness",
        description: "A stone statue in a town square has seen every crime committed in the last 200 years.",
        genre: "Thriller",
        status: "published",
        views: 1100,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "The Painter of Dreams",
        description: "What happens when the paintings you create start manifesting in the real world?",
        genre: "Fantasy",
        status: "published",
        views: 2600,
        publishedAt: new Date()
    },
    {
        author: AUTHOR_ID,
        title: "Across the Frozen Tundra",
        description: "A survival story of a group lost in the unforgiving Arctic wilderness.",
        genre: "Adventure",
        status: "published",
        views: 950,
        publishedAt: new Date()
    }
];

async function seed() {
    try {
        await dbConnect();
        await Story.deleteMany({ author: AUTHOR_ID }); // Clear old seeded stories
        await Story.insertMany(stories);
        console.log('✅ Seeded 10 stories successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
