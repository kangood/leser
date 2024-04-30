import React from 'react';

export const FeedTop = ({ appState, toggleMenu, toggleSearch }) => {
    return (
        <div className="feed-top dragging">
            <a className="back-outside">
                <img
                    src="icons/backward.svg"
                    onClick={() => toggleMenu(true)}
                    className="backward undragging"
                />
            </a>
            <span className="title">{appState.title}</span>
            <a className="search-outside">
                <img
                    src="icons/search.svg"
                    onClick={toggleSearch}
                    className="search undragging"
                />
            </a>
        </div>
    );
};